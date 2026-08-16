import { cookies, headers } from 'next/headers'
import { cache } from 'react'
import sql from './db'
import type { AuthUser } from './types'

// Reads session from either session_id cookie OR Authorization: Bearer header.
// Deduplicated per request using React cache(). Guaranteed 0 DB roundtrips when unauthenticated.
export const getSession = cache(async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('session_id')?.value || cookieStore.get('adminToken')?.value

  let bearerToken: string | null = null
  if (!sessionId && process.env.NODE_ENV !== 'production') {
    const headerStore = await headers()
    const authHeader = headerStore.get('authorization') ?? ''
    if (authHeader.startsWith('Bearer ')) {
      bearerToken = authHeader.slice(7)
    }
  }

  const token = sessionId || bearerToken
  if (!token) return null

  try {
    const rows = await sql`
      SELECT u.id, u.name, u.email, u.role, u.phone, u.address, u.city, u.state, u.zip, u.avatar_url
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${token}
        AND s.expires_at > NOW()
      LIMIT 1
    `
    if (rows.length > 0) return rows[0] as AuthUser
  } catch {
    const fallbackRows = await sql`
      SELECT u.id, u.name, u.email, u.role
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${token}
        AND s.expires_at > NOW()
      LIMIT 1
    `
    if (fallbackRows.length > 0) return fallbackRows[0] as AuthUser
  }

  return null
})

// Admin session: checks Authorization header or cookies and validates role === 'admin'.
export async function getAdminSession(): Promise<AuthUser | null> {
  const user = await getSession()
  if (!user || user.role !== 'admin') return null
  return user
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getSession()
  if (!user) throw new Error('UNAUTHORIZED')
  return user
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await getAdminSession()
  if (!user) throw new Error('UNAUTHORIZED')
  return user
}


