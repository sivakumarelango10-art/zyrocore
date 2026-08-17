import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()

    // Execute all 4 report queries concurrently in parallel
    const [monthlySales, productPerformance, customerGrowth, statusDistribution] = await Promise.all([
      // Monthly Sales & Revenue breakdown (last 12 months)
      sql`
        SELECT 
          TO_CHAR(created_at, 'Mon YYYY') as month,
          DATE_TRUNC('month', created_at) as month_date,
          COUNT(*) as total_orders,
          COALESCE(SUM(total), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0) as delivered_revenue
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY month, month_date
        ORDER BY month_date ASC
      `,
      // Product performance report (top items sold & revenue)
      sql`
        SELECT 
          oi.product_name,
          SUM(oi.quantity) as units_sold,
          SUM(oi.price * oi.quantity) as total_revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled'
        GROUP BY oi.product_name
        ORDER BY total_revenue DESC
        LIMIT 10
      `,
      // Customer growth report (registrations per month)
      sql`
        SELECT 
          TO_CHAR(created_at, 'Mon YYYY') as month,
          DATE_TRUNC('month', created_at) as month_date,
          COUNT(*) as new_customers
        FROM users
        WHERE role = 'user' AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY month, month_date
        ORDER BY month_date ASC
      `,
      // Order status breakdown
      sql`
        SELECT status, COUNT(*) as count
        FROM orders
        GROUP BY status
      `,
    ])

    return NextResponse.json({
      monthlySales: monthlySales.map(m => ({
        month: m.month,
        orders: parseInt(m.total_orders),
        revenue: parseFloat(m.total_revenue),
        deliveredRevenue: parseFloat(m.delivered_revenue),
      })),
      productPerformance: productPerformance.map(p => ({
        product_name: p.product_name,
        units_sold: parseInt(p.units_sold),
        total_revenue: parseFloat(p.total_revenue),
      })),
      customerGrowth: customerGrowth.map(c => ({
        month: c.month,
        new_customers: parseInt(c.new_customers),
      })),
      statusDistribution: statusDistribution.map(s => ({
        name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
        value: parseInt(s.count),
      })),
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'error'
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[reports] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
