import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST() {
  // Delete cookie-based session
  const cookieStore = await cookies()
  const cookieSessionId = cookieStore.get('session_id')?.value || cookieStore.get('adminToken')?.value

  // Delete Bearer token-based session (localStorage tokens)
  const headerStore = await headers()
  const authHeader = headerStore.get('authorization') ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  // Collect all session IDs to delete
  const sessionIds = [cookieSessionId, bearerToken].filter(Boolean) as string[]

  for (const sid of sessionIds) {
    try {
      await sql`DELETE FROM sessions WHERE id = ${sid}`
    } catch {
      // Non-fatal — session may already be expired
    }
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('session_id', '', { expires: new Date(0), path: '/' })
  response.cookies.set('adminToken', '', { expires: new Date(0), path: '/' })
  return response
}
