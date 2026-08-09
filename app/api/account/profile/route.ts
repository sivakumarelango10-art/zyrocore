import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import sql from '@/lib/db'
import bcrypt from 'bcryptjs'

// Ensure user columns exist safely on database
async function ensureUserColumns() {
  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100)`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(100)`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS zip VARCHAR(20)`
  } catch (err) {
    console.error('[ensureUserColumns] Warning:', err)
  }
}

export async function GET() {
  const sessionUser = await getSession()
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureUserColumns()

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

  await ensureUserColumns()

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

    const { name, phone, address, city, state, zip, newPassword } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    let passwordHash: string | null = null
    if (newPassword && typeof newPassword === 'string' && newPassword.trim().length > 0) {
      if (newPassword.trim().length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
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
