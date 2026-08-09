import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const orders = await sql`
      SELECT o.* FROM orders o
      WHERE o.id = ${parseInt(id)} AND (o.user_id = ${user.id} OR ${user.role} = 'admin')
    `
    if (orders.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const items = await sql`SELECT * FROM order_items WHERE order_id = ${parseInt(id)}`

    return NextResponse.json({ order: { ...orders[0], items } })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
