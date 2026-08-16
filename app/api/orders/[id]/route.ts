import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const orderIdNum = parseInt(id)
    if (isNaN(orderIdNum)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
    }

    const orders = user.role === 'admin'
      ? await sql`
          SELECT o.*,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', oi.id,
                  'product_id', oi.product_id,
                  'product_name', oi.product_name,
                  'product_image', oi.product_image,
                  'price', oi.price,
                  'quantity', oi.quantity,
                  'size', oi.size
                )
              ) FILTER (WHERE oi.id IS NOT NULL), '[]'
            ) as items
          FROM orders o
          LEFT JOIN order_items oi ON o.id = oi.order_id
          WHERE o.id = ${orderIdNum}
          GROUP BY o.id
        `
      : await sql`
          SELECT o.*,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', oi.id,
                  'product_id', oi.product_id,
                  'product_name', oi.product_name,
                  'product_image', oi.product_image,
                  'price', oi.price,
                  'quantity', oi.quantity,
                  'size', oi.size
                )
              ) FILTER (WHERE oi.id IS NOT NULL), '[]'
            ) as items
          FROM orders o
          LEFT JOIN order_items oi ON o.id = oi.order_id
          WHERE o.id = ${orderIdNum} AND o.user_id = ${user.id}
          GROUP BY o.id
        `

    if (orders.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ order: orders[0] })
  } catch (error) {
    console.error('[orders/[id] GET] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
