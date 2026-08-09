import { type NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import sql from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAdminAction } from '@/lib/audit'

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 30 * 60 * 1000 // 30 minutes

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '127.0.0.1'

    let email: string, password: string
    try {
      const body = await req.json()
      email = (typeof body.email === 'string' ? body.email : '').trim().toLowerCase().slice(0, 254)
      password = typeof body.password === 'string' ? body.password : ''
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (password.length > 256) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Rate limit: 5 attempts per IP per email per minute
    const rateKey = `login:${ip}:${email}`
    const rate = await checkRateLimit(rateKey, 5, 60_000)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait a minute before trying again.' },
        { status: 429 }
      )
    }

    const users = await sql`
      SELECT id, name, email, password_hash, role, status,
             COALESCE(failed_login_attempts, 0) AS failed_login_attempts,
             lockout_until
      FROM users
      WHERE LOWER(email) = ${email}
      LIMIT 1
    `

    const dummyHash = '$2b$12$rQ8bpC5vB7iK9mN1oP3qRuS6tW0xY2zA4bD7eF9gH2iJ5kL8mN1oP3'
    const user = users[0] ?? null
    const hashToCompare = user?.password_hash || dummyHash

    // --- Check lockout BEFORE comparing password ---
    if (user?.lockout_until && new Date(user.lockout_until) > new Date()) {
      const remainingMs = new Date(user.lockout_until).getTime() - Date.now()
      const remainingMin = Math.ceil(remainingMs / 60_000)
      return NextResponse.json(
        { error: `Too many unsuccessful login attempts. Please try again after ${remainingMin} minute${remainingMin !== 1 ? 's' : ''}.` },
        { status: 429 }
      )
    }

    const valid = await bcrypt.compare(password, hashToCompare)

    if (!user || !valid) {
      if (user) {
        const newCount = (Number(user.failed_login_attempts) || 0) + 1
        try {
          if (newCount >= MAX_ATTEMPTS) {
            const lockoutUntil = new Date(Date.now() + LOCKOUT_MS).toISOString()
            await sql`UPDATE users SET failed_login_attempts = ${newCount}, lockout_until = ${lockoutUntil} WHERE id = ${user.id}`
            if (user.role === 'admin') {
              await logAdminAction(user.id, 'admin_login_lockout', `Locked after ${newCount} failed attempts. IP: ${ip}`, ip)
            }
            return NextResponse.json(
              { error: 'Too many unsuccessful login attempts. Please try again after 30 minutes.' },
              { status: 429 }
            )
          } else {
            await sql`UPDATE users SET failed_login_attempts = ${newCount} WHERE id = ${user.id}`
          }
        } catch (updateErr) {
          console.error('[auth/login] Failed to update attempt counter:', updateErr)
        }
      }
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (user.status === 'suspended') {
      return NextResponse.json({ error: 'Account has been suspended. Please contact support.' }, { status: 403 })
    }

    // Success: reset failures, update login tracking
    await sql`
      UPDATE users
      SET failed_login_attempts = 0,
          lockout_until = NULL,
          last_login_at = NOW(),
          login_count = COALESCE(login_count, 0) + 1
      WHERE id = ${user.id}
    `

    if (user.role === 'admin') {
      try {
        await logAdminAction(user.id, 'admin_login_success', `Admin signed in via unified login. IP: ${ip}`, ip)
      } catch { /* non-fatal */ }
    }

    const sessionId = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + (user.role === 'admin' ? 8 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000))

    await sql`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES (${sessionId}, ${user.id}, ${expiresAt.toISOString()})
    `

    const redirectTo = user.role === 'admin' ? '/secure-admin' : '/account'

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token: sessionId,
      redirectTo,
    })

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      expires: expiresAt,
      path: '/',
    }

    response.cookies.set('session_id', sessionId, cookieOpts)
    if (user.role === 'admin') {
      response.cookies.set('adminToken', sessionId, cookieOpts)
    }

    return response
  } catch (error) {
    console.error('[auth/login] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
