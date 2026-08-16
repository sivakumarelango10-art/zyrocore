import { type NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getAvailableStockForSize } from '@/lib/inventory-utils'

/**
 * POST /api/cart/validate
 *
 * Validates cart items against current database stock before checkout.
 * Call this immediately before initiating payment to catch any stock changes
 * that occurred after items were added to cart.
 *
 * Body: { items: Array<{ product_id: number; quantity: number; size?: string; product_name: string }> }
 * Returns: { valid: boolean; errors: Array<{ product_name: string; size?: string; requested: number; available: number; message: string }> }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 })
    }

    const { items } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ valid: true, errors: [] })
    }

    // Extract unique product IDs
    const productIds = [
      ...new Set(
        items
          .map((item: any) => item.product_id)
          .filter((id: any): id is number => typeof id === 'number' && id > 0)
      ),
    ]

    if (productIds.length === 0) {
      return NextResponse.json({ valid: true, errors: [] })
    }

    // Single batch query for all products
    const dbProducts = await sql`
      SELECT id, name, stock, size_stock
      FROM products
      WHERE id = ANY(${productIds}::int[])
    `

    const productMap = new Map<number, any>()
    for (const p of dbProducts) {
      // Normalize size_stock
      let sizeStock: Record<string, number> = {}
      if (typeof p.size_stock === 'object' && p.size_stock !== null) {
        sizeStock = p.size_stock
      } else if (typeof p.size_stock === 'string') {
        try { sizeStock = JSON.parse(p.size_stock) } catch {}
      }
      productMap.set(p.id, { ...p, size_stock: sizeStock })
    }

    const errors: Array<{
      product_id: number
      product_name: string
      size?: string
      requested: number
      available: number
      message: string
    }> = []

    for (const item of items as Array<{
      product_id?: number
      product_name: string
      quantity: number
      size?: string
    }>) {
      if (!item.product_id) continue

      const qty = Math.floor(Number(item.quantity) || 0)
      if (qty <= 0) continue

      const product = productMap.get(item.product_id)

      if (!product) {
        errors.push({
          product_id: item.product_id,
          product_name: item.product_name,
          size: item.size,
          requested: qty,
          available: 0,
          message: `"${item.product_name}" is no longer available.`,
        })
        continue
      }

      const avail = getAvailableStockForSize(product.stock, product.size_stock, item.size)
      if (avail < qty) {
        errors.push({
          product_id: item.product_id,
          product_name: product.name,
          size: item.size,
          requested: qty,
          available: avail,
          message: avail === 0
            ? (item.size ? `${product.name} — Size ${item.size} is out of stock.` : `${product.name} is out of stock.`)
            : `${product.name}${item.size ? ` (Size ${item.size})` : ''}: only ${avail} left in stock.`,
        })
      }
    }

    return NextResponse.json({
      valid: errors.length === 0,
      errors,
    })
  } catch (error) {
    console.error('[cart/validate POST] unexpected error:', error)
    return NextResponse.json({ error: 'Failed to validate cart' }, { status: 500 })
  }
}
