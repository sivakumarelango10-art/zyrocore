import { type NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import sql from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    // M-01: Rate limit registrations per IP — 5 attempts per minute
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '127.0.0.1'
    const rateKey = `register:${ip}`
    const rate = await checkRateLimit(rateKey, 5, 60_000)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please wait a minute before trying again.' },
        { status: 429 }
      )
    }

    const { name, email, password, phone } = await req.json()

    if (!name || !email || !password || !phone) {
      return NextResponse.json({ error: 'All fields including Mobile Number are required' }, { status: 400 })
    }

    // Input length guards to prevent DoS via oversized payloads
    if (typeof name !== 'string' || name.trim().length > 100) {
      return NextResponse.json({ error: 'Name must be 100 characters or fewer' }, { status: 400 })
    }
    if (typeof email !== 'string' || email.trim().length > 254) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    if (typeof phone !== 'string' || !phone.trim() || phone.trim().length > 50) {
      return NextResponse.json({ error: 'Please enter a valid mobile number' }, { status: 400 })
    }
    if (typeof password !== 'string' || password.length > 256) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 400 })
    }

    // Password strength requirements
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.' },
        { status: 400 }
      )
    }

    const existing = await sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${email.trim()})`
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const newUsers = await sql`
      INSERT INTO users (name, email, password_hash, role, status, phone, last_login_at, login_count)
      VALUES (${name.trim()}, ${email.trim().toLowerCase()}, ${passwordHash}, 'user', 'active', ${phone.trim()}, NOW(), 1)
      RETURNING id, name, email, role, phone
    `
    const user = newUsers[0]

    const sessionId = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await sql`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES (${sessionId}, ${user.id}, ${expiresAt.toISOString()})
    `

    const response = NextResponse.json({ user, token: sessionId })

    const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https'
    response.cookies.set('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && isHttps,
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
