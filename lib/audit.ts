import sql from './db'

export async function logAdminAction(
  userId: number | null,
  action: string,
  details?: string,
  ipAddress?: string
) {
  try {
    await sql`
      INSERT INTO audit_logs (user_id, action, details, ip_address)
      VALUES (${userId}, ${action}, ${details || null}, ${ipAddress || null})
    `
  } catch (err) {
    console.error('[logAdminAction] Error writing audit log:', err)
  }
}
