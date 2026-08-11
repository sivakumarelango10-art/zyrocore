import { type NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const itemId = parseInt(id)
    if (isNaN(itemId)) return NextResponse.json({ error: 'Invalid cart item ID' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const quantity = Math.floor(Number(body.quantity) || 0)

    if (quantity < 1) {
      await sql`DELETE FROM cart_items WHERE id = ${itemId} AND user_id = ${user.id}`
      return NextResponse.json({ success: true })
    }

    const cartItemRes = await sql`
      SELECT ci.id, ci.product_id, ci.size, p.stock, p.size_stock
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.id = ${itemId} AND ci.user_id = ${user.id}
    `

    if (cartItemRes.length === 0) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })
    }

    const item = cartItemRes[0]

    if (item.size) {
      const sizeStockObj = (typeof item.size_stock === 'object' && item.size_stock !== null) ? item.size_stock : {}
      const availForSize = Math.max(0, Number(sizeStockObj[item.size]) || 0)
      if (quantity > availForSize) {
        return NextResponse.json({ error: 'Only the available quantity can be added for this size.' }, { status: 400 })
      }
    } else {
      const overallStock = Math.max(0, Number(item.stock) || 0)
      if (quantity > overallStock) {
        return NextResponse.json({ error: 'Only the available quantity can be added for this product.' }, { status: 400 })
      }
    }

    await sql`
      UPDATE cart_items SET quantity = ${quantity}
      WHERE id = ${itemId} AND user_id = ${user.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cart PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
