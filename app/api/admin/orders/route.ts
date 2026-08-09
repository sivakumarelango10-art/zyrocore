import { type NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// Admin: get all orders
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const orders = status
      ? await sql`
          SELECT o.*, u.name as user_name, u.email as user_email
          FROM orders o LEFT JOIN users u ON o.user_id = u.id
          WHERE o.status = ${status}
          ORDER BY o.created_at DESC LIMIT ${limit} OFFSET ${offset}
        `
      : await sql`
          SELECT o.*, u.name as user_name, u.email as user_email
          FROM orders o LEFT JOIN users u ON o.user_id = u.id
          ORDER BY o.created_at DESC LIMIT ${limit} OFFSET ${offset}
        `

    const countResult = status
      ? await sql`SELECT COUNT(*) FROM orders WHERE status = ${status}`
      : await sql`SELECT COUNT(*) FROM orders`

    return NextResponse.json({ orders, total: parseInt(countResult[0].count) })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'error'
    if (msg === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
