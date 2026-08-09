import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAdminAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()


    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
    const offset = (page - 1) * limit

    const customers = await sql`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        COALESCE(u.status, 'active') as status,
        COALESCE(u.login_count, 0) as login_count,
        u.last_login_at,
        u.created_at,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE u.role = 'user'
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const countRes = await sql`SELECT COUNT(*) FROM users WHERE role = 'user'`
    const total = parseInt(countRes[0]?.count || '0')

    return NextResponse.json({
      customers: customers.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        status: c.status,
        login_count: parseInt(c.login_count),
        last_login_at: c.last_login_at,
        created_at: c.created_at,
        total_orders: parseInt(c.total_orders),
        total_spent: parseFloat(c.total_spent),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'error'
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[customers GET] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  let admin
  try {
    admin = await requireAdmin()

    const { userId, status } = await req.json()

    if (!userId || !['active', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    await sql`
      UPDATE users
      SET status = ${status}
      WHERE id = ${userId} AND role = 'user'
    `

    await logAdminAction(admin.id, 'update_customer_status', `Updated customer #${userId} status to ${status}`)

    return NextResponse.json({ success: true, status })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'error'
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[customers PATCH] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
