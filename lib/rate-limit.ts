import sql from './db'

/**
 * Database-backed rate limiter to support multi-process and serverless deployments.
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const now = new Date()
    const resetTime = new Date(now.getTime() + windowMs)

    // Using PostgreSQL UPSERT to set/increment rate limit counts safely
    const rows = await sql`
      INSERT INTO rate_limits (key, count, reset_time)
      VALUES (${identifier}, 1, ${resetTime})
      ON CONFLICT (key) DO UPDATE
      SET 
        count = CASE 
          WHEN rate_limits.reset_time < NOW() THEN 1 
          ELSE rate_limits.count + 1 
        END,
        reset_time = CASE 
          WHEN rate_limits.reset_time < NOW() THEN EXCLUDED.reset_time 
          ELSE rate_limits.reset_time 
        END
      RETURNING count, reset_time
    `

    const record = rows[0]
    const count = record.count
    const isAllowed = count <= maxRequests
    const remaining = Math.max(0, maxRequests - count)

    // Asynchronously delete expired limits with a 5% probability
    if (Math.random() < 0.05) {
      sql`DELETE FROM rate_limits WHERE reset_time < NOW()`.catch(console.error)
    }

    return { allowed: isAllowed, remaining }
  } catch (err) {
    console.error('[checkRateLimit] Database error:', err)
    // Fail-open fallback to prevent DB latency/downtime from locking out users
    return { allowed: true, remaining: 1 }
  }
}
