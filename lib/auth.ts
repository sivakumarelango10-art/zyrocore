import { cookies, headers } from 'next/headers'
import { cache } from 'react'
import sql from './db'
import type { AuthUser } from './types'

// Reads session from either session_id cookie OR Authorization: Bearer header.
// The Bearer token path is needed in the v0 preview iframe where cookies are blocked.
export const getSession = cache(async (): Promise<AuthUser | null> => {
  // 1. Try Authorization header (only in non-production environments)
  if (process.env.NODE_ENV !== 'production') {
    const headerStore = await headers()
    const authHeader = headerStore.get('authorization') ?? ''
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (bearerToken) {
      try {
        const rows = await sql`
          SELECT u.id, u.name, u.email, u.role, u.phone, u.address, u.city, u.state, u.zip, u.avatar_url
          FROM sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.id = ${bearerToken}
            AND s.expires_at > NOW()
        `
        if (rows.length > 0) return rows[0] as AuthUser
      } catch {
        const fallbackRows = await sql`
          SELECT u.id, u.name, u.email, u.role
          FROM sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.id = ${bearerToken}
            AND s.expires_at > NOW()
        `
        if (fallbackRows.length > 0) return fallbackRows[0] as AuthUser
      }
    }
  }

  // 2. Fall back to session_id OR adminToken cookie
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('session_id')?.value || cookieStore.get('adminToken')?.value
  if (!sessionId) return null

  try {
    const rows = await sql`
      SELECT u.id, u.name, u.email, u.role, u.phone, u.address, u.city, u.state, u.zip, u.avatar_url
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId}
        AND s.expires_at > NOW()
    `
    if (rows.length === 0) return null
    return rows[0] as AuthUser
  } catch {
    const fallbackRows = await sql`
      SELECT u.id, u.name, u.email, u.role
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId}
        AND s.expires_at > NOW()
    `
    if (fallbackRows.length === 0) return null
    return fallbackRows[0] as AuthUser
  }
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

