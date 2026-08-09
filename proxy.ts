import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Generate a random cryptographic nonce using crypto.randomUUID()
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  // Strict Content Security Policy (CSP) - removing unsafe-inline and unsafe-eval
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' ${process.env.NODE_ENV !== 'production' ? "'unsafe-eval'" : ''} https://va.vercel-scripts.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: blob: https://*.supabase.co https://*.public.blob.vercel-storage.com https://blob.vercel-storage.com https://lh3.googleusercontent.com;
    connect-src 'self' https://*.supabase.co https://va.vercel-scripts.com https://nominatim.openstreetmap.org https://maps.googleapis.com https://accounts.google.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self' https://*.supabase.co https://accounts.google.com;
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
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)')
  res.headers.set('Content-Security-Policy', cspHeader)

  // Public admin endpoints (logout only)
  if (pathname === '/api/admin/auth/logout') {
    return res
  }

  // Protect /secure-admin and /admin routes — redirect unauthenticated to unified /login
  if (pathname.startsWith('/secure-admin') || pathname.startsWith('/admin')) {
    const token = req.cookies.get('session_id')?.value || req.cookies.get('adminToken')?.value
    if (!token) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/login'
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
