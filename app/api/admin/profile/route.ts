import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import sql from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAdminAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = await requireAdmin()

    const rows = await sql`
      SELECT id, name, email, role, avatar_url, phone, address, city, state, zip, created_at
      FROM users
      WHERE id = ${admin.id} AND role = 'admin'
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 })
    }

    return NextResponse.json({ user: rows[0] })
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 })
    }
    console.error('[api/admin/profile GET error]:', error)
    return NextResponse.json({ error: 'Failed to fetch admin profile' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin()

    const body = await req.json().catch(() => ({}))
    const { name, avatar_url, current_password, new_password } = body

    // 1. Fetch existing user record
    const [existingUser] = await sql`
      SELECT id, name, email, password_hash, avatar_url
      FROM users
      WHERE id = ${admin.id} AND role = 'admin'
      LIMIT 1
    `

    if (!existingUser) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 404 })
    }

    let newName = existingUser.name
    if (typeof name === 'string') {
      const trimmedName = name.trim()
      if (!trimmedName) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      newName = trimmedName
    }

    let newAvatarUrl: string | null = existingUser.avatar_url
    if (avatar_url !== undefined) {
      newAvatarUrl = avatar_url ? String(avatar_url).trim() : null
    }

    let updatedPasswordHash = existingUser.password_hash

    // 2. Handle Password Change if requested
    if (new_password) {
      if (!current_password) {
        return NextResponse.json({ error: 'Current password is required to set a new password.' }, { status: 400 })
      }

      const isCurrentPasswordValid = await bcrypt.compare(current_password, existingUser.password_hash)
      if (!isCurrentPasswordValid) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 })
      }

      // Password Strength Validation
      const hasMinLength = new_password.length >= 8
      const hasUpper = /[A-Z]/.test(new_password)
      const hasLower = /[a-z]/.test(new_password)
      const hasNumber = /[0-9]/.test(new_password)
      const hasSpecial = /[^A-Za-z0-9]/.test(new_password)

      if (!hasMinLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
        return NextResponse.json({
          error: 'New password must be at least 8 characters long and include uppercase, lowercase, number, and special character.'
        }, { status: 400 })
      }

      updatedPasswordHash = await bcrypt.hash(new_password, 12)
    }

    // 3. Update database record
    const [updatedUser] = await sql`
      UPDATE users
      SET name = ${newName},
          avatar_url = ${newAvatarUrl},
          password_hash = ${updatedPasswordHash}
      WHERE id = ${admin.id} AND role = 'admin'
      RETURNING id, name, email, role, avatar_url, phone, address, city, state, zip, created_at
    `

    try {
      await logAdminAction(admin.id, 'profile_update', `Updated profile (name: ${newName}, photo: ${newAvatarUrl ? 'updated' : 'cleared'})`)
    } catch { /* non-fatal audit log catch */ }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    })
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 })
    }
    console.error('[api/admin/profile PUT error]:', error)
    return NextResponse.json({ error: 'Failed to update admin profile' }, { status: 500 })
  }
}
