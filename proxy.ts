import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function getProxyOrigin(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    let appUrl = process.env.NEXT_PUBLIC_APP_URL.trim()
    if (!appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
      appUrl = `https://${appUrl}`
    }
    return appUrl.replace(/\/$/, '')
  }

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')

  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return `${proto}://${host}`
  }

  const reqOrigin = req.nextUrl?.origin || new URL(req.url).origin
  if (reqOrigin && !reqOrigin.includes('localhost') && !reqOrigin.includes('127.0.0.1')) {
    return reqOrigin
  }

  if (host) {
    return `${proto}://${host}`
  }

  return reqOrigin
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Generate a random cryptographic nonce using crypto.randomUUID()
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  // Strict Content Security Policy (CSP) allowing Razorpay, Supabase, Google
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://cdn.razorpay.com https://va.vercel-scripts.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: blob: https: http:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://checkout.razorpay.com https://va.vercel-scripts.com https://nominatim.openstreetmap.org https://maps.googleapis.com https://accounts.google.com;
    frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com;
    worker-src 'self' blob:;
    base-uri 'self';
    form-action 'self' https://*.supabase.co https://accounts.google.com https://checkout.razorpay.com;
  `.replace(/\s{2,}/g, ' ').trim()

  // Apply Security Headers to all responses
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader)

  // Initialize response passing modified headers
  let res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Apply Security Headers to the response
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com")')
  res.headers.set('Content-Security-Policy', cspHeader)

  // Public admin endpoints (logout only)
  if (pathname === '/api/admin/auth/logout') {
    return res
  }

  // Protect /secure-admin and /admin routes — redirect unauthenticated to unified /login
  if (pathname.startsWith('/secure-admin') || pathname.startsWith('/admin')) {
    const token = req.cookies.get('session_id')?.value || req.cookies.get('adminToken')?.value
    if (!token) {
      const origin = getProxyOrigin(req)
      const loginUrl = new URL('/login', origin)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return res
  }

  // Protect /api/admin/* routes
  if (pathname.startsWith('/api/admin')) {
    const token =
      req.cookies.get('adminToken')?.value ||
      req.cookies.get('session_id')?.value ||
      (process.env.NODE_ENV !== 'production' ? req.headers.get('authorization')?.replace('Bearer ', '') : undefined)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - icon.svg (icon file)
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.png|.*\\.jpg).*)',
      missing: [
        { type: 'header', key: 'next-action' },
      ],
    },
  ],
}
