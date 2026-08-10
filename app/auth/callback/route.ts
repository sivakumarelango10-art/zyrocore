import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import sql from '@/lib/db'

function getCallbackOrigin(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    let appUrl = process.env.NEXT_PUBLIC_APP_URL.trim()
    if (!appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
      appUrl = `https://${appUrl}`
    }
    return appUrl.replace(/\/$/, '')
  }

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')

  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return `${proto}://${host}`
  }

  const reqOrigin = request.nextUrl?.origin || new URL(request.url).origin
  if (reqOrigin && !reqOrigin.includes('localhost') && !reqOrigin.includes('127.0.0.1')) {
    return reqOrigin
  }

  if (host) {
    return `${proto}://${host}`
  }

  return reqOrigin
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const origin = getCallbackOrigin(request)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const next = searchParams.get('next') ?? searchParams.get('from') ?? '/'

  if (errorParam || errorDescription) {
    const errorMsg = errorDescription || errorParam || 'Authentication failed'
    console.error('[auth/callback] Provider error:', errorMsg)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorMsg)}`)
  }

  if (code) {
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      ''

    if (!supabaseUrl || !supabaseKey) {
      console.error('[auth/callback] Missing Supabase environment variables')
      return NextResponse.redirect(`${origin}/login?error=Authentication service not configured`)
    }

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore if called from a Server Component / Route Handler
          }
        },
      },
    })

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.user) {
      const authUser = data.user
      const email = authUser.email?.toLowerCase().trim()
      const rawName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.user_metadata?.custom_claims?.global_name ||
        (email ? email.split('@')[0] : 'Google User')

      if (email) {
        try {
          const dbUsers = await sql`
            SELECT id, name, email, role, status
            FROM users
            WHERE LOWER(email) = ${email}
            LIMIT 1
          `

          let userId: number
          let userRole = 'user'

          if (dbUsers.length > 0) {
            if (dbUsers[0].status === 'suspended') {
              return NextResponse.redirect(`${origin}/login?error=Your account has been suspended. Please contact support.`)
            }

            userId = dbUsers[0].id
            userRole = dbUsers[0].role

            await sql`
              UPDATE users
              SET last_login_at = NOW(),
                  login_count = COALESCE(login_count, 0) + 1,
                  failed_login_attempts = 0,
                  lockout_until = NULL
              WHERE id = ${userId}
            `
          } else {
            // L-02: Conventional sentinel — bcryptjs compare() will always return false for this value
            const placeholderHash = 'OAUTH_USER_NO_PASSWORD'
            const newUsers = await sql`
              INSERT INTO users (name, email, password_hash, role, status, login_count, last_login_at)
              VALUES (${rawName}, ${email}, ${placeholderHash}, 'user', 'active', 1, NOW())
              RETURNING id, role
            `
            userId = newUsers[0].id
            userRole = newUsers[0].role
          }

          // Create session in custom sessions table
          const sessionId = randomBytes(32).toString('hex')
          const expiresAt = new Date(
            Date.now() + (userRole === 'admin' ? 8 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000)
          )

          await sql`
            INSERT INTO sessions (id, user_id, expires_at)
            VALUES (${sessionId}, ${userId}, ${expiresAt.toISOString()})
          `

          const targetPath = userRole === 'admin' ? '/secure-admin' : (next.startsWith('/') ? next : '/')
          const response = NextResponse.redirect(`${origin}${targetPath}`)

          const isHttps = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'
          const cookieOpts = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && isHttps,
            sameSite: 'lax' as const,
            expires: expiresAt,
            path: '/',
          }

          response.cookies.set('session_id', sessionId, cookieOpts)
          if (userRole === 'admin') {
            response.cookies.set('adminToken', sessionId, cookieOpts)
          }

          return response
        } catch (dbErr) {
          console.error('[auth/callback] Database error:', dbErr)
          return NextResponse.redirect(`${origin}/login?error=Failed to process account session`)
        }
      }
    } else if (error) {
      console.error('[auth/callback] OAuth exchange error:', error)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message || 'Google authentication failed')}`
      )
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Invalid or missing authentication code`)
}
