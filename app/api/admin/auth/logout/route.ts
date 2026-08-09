import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { logAdminAction } from '@/lib/audit'

export async function POST() {
  const cookieStore = await cookies()
  const headerStore = await headers()

  // Collect all session tokens to invalidate
  const cookieSession = cookieStore.get('session_id')?.value
  const cookieAdmin = cookieStore.get('adminToken')?.value
  const authHeader = headerStore.get('authorization') ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  const sessionIds = [...new Set([cookieSession, cookieAdmin, bearerToken].filter(Boolean))] as string[]

  for (const sid of sessionIds) {
    try {
      // Look up user before deleting for audit log
      const rows = await sql`SELECT user_id FROM sessions WHERE id = ${sid}`
      if (rows.length > 0) {
        await logAdminAction(rows[0].user_id, 'admin_logout', 'Admin session invalidated')
      }
      await sql`DELETE FROM sessions WHERE id = ${sid}`
    } catch {
      // Non-fatal — session may already be expired
    }
  }

  const response = NextResponse.json({ success: true })
  // Expire all auth cookies
  response.cookies.set('session_id', '', { expires: new Date(0), path: '/', httpOnly: true })
  response.cookies.set('adminToken', '', { expires: new Date(0), path: '/', httpOnly: true })
  return response
}
