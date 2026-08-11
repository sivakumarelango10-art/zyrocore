import { type NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ items: [] })

    const items = await sql`
      SELECT ci.*, 
        p.id as product_id, p.name, p.price, p.discount_price, p.images, p.stock, p.sizes
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ${user.id}
      ORDER BY ci.created_at DESC
    `
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Cart GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Validate auth
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })

    // 2. Parse and validate body
    let body: { product_id?: unknown; quantity?: unknown; size?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { product_id, quantity = 1, size = null } = body

    if (!product_id) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
    }
    const qty = Number(quantity)
    if (!qty || qty < 1) {
      return NextResponse.json({ error: 'quantity must be a positive number' }, { status: 400 })
    }

    // 3. Validate product exists
    const products = await sql`
      SELECT id, stock, sizes, size_stock FROM products WHERE id = ${product_id as number}
    `
    if (products.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const product = products[0]

    // 4. Validate size requirement
    const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0
    if (hasSizes && !size) {
      return NextResponse.json({ error: 'Please select a size' }, { status: 400 })
    }

    // 5. Validate size-specific stock and overall stock
    const sizeStockObj = (typeof product.size_stock === 'object' && product.size_stock !== null) ? product.size_stock : {}
    if (size) {
      const availableForSize = Math.max(0, Number(sizeStockObj[size as string]) || 0)
      if (availableForSize === 0) {
        return NextResponse.json({ error: `Size ${size} is out of stock.` }, { status: 400 })
      }
      if (availableForSize < qty) {
        return NextResponse.json({ error: `Only ${availableForSize} item(s) available in size ${size}.` }, { status: 400 })
      }
    } else {
      const overallStock = Number(product.stock) || 0
      if (overallStock < qty) {
        return NextResponse.json({ error: `Only ${overallStock} item(s) available in stock.` }, { status: 400 })
      }
    }

    // 6. Upsert cart item
    const sizeVal: string | null = typeof size === 'string' && size ? size : null
    const existing = await sql`
      SELECT id, quantity FROM cart_items
      WHERE user_id = ${user.id}
        AND product_id = ${product_id as number}
        AND size IS NOT DISTINCT FROM ${sizeVal}
    `

    if (existing.length > 0) {
      await sql`
        UPDATE cart_items SET quantity = quantity + ${qty}
        WHERE id = ${existing[0].id}
      `
    } else {
      await sql`
        INSERT INTO cart_items (user_id, product_id, quantity, size)
        VALUES (${user.id}, ${product_id as number}, ${qty}, ${sizeVal})
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cart POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const itemId = searchParams.get('id')

    if (itemId) {
      await sql`DELETE FROM cart_items WHERE id = ${parseInt(itemId)} AND user_id = ${user.id}`
    } else {
      await sql`DELETE FROM cart_items WHERE user_id = ${user.id}`
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cart DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
