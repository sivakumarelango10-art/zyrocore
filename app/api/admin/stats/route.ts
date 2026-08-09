import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    await requireAdmin()

    const [summary] = await sql`
      SELECT
        COALESCE((SELECT SUM(total) FROM orders WHERE status != 'cancelled'), 0) AS revenue,
        (SELECT COUNT(*) FROM orders) AS orders,
        (SELECT COUNT(*) FROM users WHERE role = 'user') AS users,
        (SELECT COUNT(*) FROM products) AS products,
        (SELECT COUNT(*) FROM products WHERE stock <= 10) AS low_stock,
        (SELECT COALESCE(SUM(quantity), 0) FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.status != 'cancelled') AS products_sold,
        (SELECT COUNT(*) FROM users WHERE role = 'user' AND created_at >= DATE_TRUNC('month', NOW())) AS new_customers,
        (SELECT COUNT(*) FROM (
          SELECT user_id FROM orders WHERE user_id IS NOT NULL GROUP BY user_id HAVING COUNT(id) > 1
        ) sub) AS returning_customers,
        (SELECT COUNT(*) FROM users WHERE role = 'user' AND last_login_at >= NOW() - INTERVAL '30 days') AS active_users
    `

    const recentOrders = await sql`
      SELECT o.id, o.status, o.total, o.created_at, u.name as user_name
      FROM orders o LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC LIMIT 5
    `

    const ordersByStatus = await sql`
      SELECT status, COUNT(*) as count FROM orders GROUP BY status
    `

    return NextResponse.json({
      stats: {
        revenue: parseFloat(summary.revenue),
        orders: parseInt(summary.orders),
        users: parseInt(summary.users),
        products: parseInt(summary.products),
        lowStock: parseInt(summary.low_stock),
        productsSold: parseInt(summary.products_sold),
        newCustomers: parseInt(summary.new_customers),
        returningCustomers: parseInt(summary.returning_customers),
        activeUsers: parseInt(summary.active_users),
      },
      recentOrders,
      ordersByStatus,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'error'
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[stats] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
