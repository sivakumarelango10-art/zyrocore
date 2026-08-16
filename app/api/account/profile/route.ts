import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import sql from '@/lib/db'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export async function GET() {
  const sessionUser = await getSession()
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await sql`
    SELECT id, name, email, role, phone, address, city, state, zip, created_at
    FROM users
    WHERE id = ${sessionUser.id}
  `

  if (rows.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user: rows[0] })
}

export async function PUT(req: Request) {
  const sessionUser = await getSession()
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let body: any = {}
    try {
      const text = await req.text()
      if (text && text.trim()) {
        body = JSON.parse(text)
      }
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 })
    }

    const { name, phone, address, city, state, zip, currentPassword, newPassword } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    let passwordHash: string | null = null

    if (newPassword && typeof newPassword === 'string' && newPassword.trim().length > 0) {
      if (!currentPassword || typeof currentPassword !== 'string' || !currentPassword.trim()) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
      }

      if (newPassword.trim().length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters long' }, { status: 400 })
      }

      if (currentPassword === newPassword.trim()) {
        return NextResponse.json({ error: 'New password must be different from current password' }, { status: 400 })
      }

      const dbUser = await sql`SELECT password_hash FROM users WHERE id = ${sessionUser.id} LIMIT 1`
      if (dbUser.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const existingHash = dbUser[0].password_hash
      if (existingHash === 'OAUTH_USER_NO_PASSWORD') {
        return NextResponse.json(
          { error: 'OAuth accounts cannot change password directly. Please log in with Google.' },
          { status: 400 }
        )
      }

      const validCurrent = await bcrypt.compare(currentPassword, existingHash)
      if (!validCurrent) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }

      passwordHash = await bcrypt.hash(newPassword.trim(), 10)
    }

    if (passwordHash) {
      await sql`
        UPDATE users
        SET name = ${name.trim()},
            phone = ${phone ? String(phone).trim() : null},
            address = ${address ? String(address).trim() : null},
            city = ${city ? String(city).trim() : null},
            state = ${state ? String(state).trim() : null},
            zip = ${zip ? String(zip).trim() : null},
            password_hash = ${passwordHash}
        WHERE id = ${sessionUser.id}
      `

      // Invalidate all other sessions for this user upon password change
      const cookieStore = await cookies()
      const currentToken = cookieStore.get('session_id')?.value || cookieStore.get('adminToken')?.value
      if (currentToken) {
        await sql`DELETE FROM sessions WHERE user_id = ${sessionUser.id} AND id != ${currentToken}`
      } else {
        await sql`DELETE FROM sessions WHERE user_id = ${sessionUser.id}`
      }
    } else {
      await sql`
        UPDATE users
        SET name = ${name.trim()},
            phone = ${phone ? String(phone).trim() : null},
            address = ${address ? String(address).trim() : null},
            city = ${city ? String(city).trim() : null},
            state = ${state ? String(state).trim() : null},
            zip = ${zip ? String(zip).trim() : null}
        WHERE id = ${sessionUser.id}
      `
    }

    const updatedRows = await sql`
      SELECT id, name, email, role, phone, address, city, state, zip
      FROM users
      WHERE id = ${sessionUser.id}
    `

    return NextResponse.json({
      message: 'Personal details updated successfully',
      user: updatedRows[0],
    })
  } catch (error: any) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update personal details' },
      { status: 500 }
    )
  }
}

