import { type NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getAvailableStockForSize } from '@/lib/inventory-utils'

export async function GET(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
    const offset = (page - 1) * limit

    const [orders, countRes] = await Promise.all([
      sql`
        SELECT o.*, 
          COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
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
        WHERE o.user_id = ${user.id}
          AND (o.payment_status = 'paid' OR o.status IN ('confirmed', 'shipped', 'delivered'))
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`SELECT COUNT(*)::int AS count FROM orders WHERE user_id = ${user.id} AND (payment_status = 'paid' OR status IN ('confirmed', 'shipped', 'delivered'))`,
    ])

    const total = parseInt(countRes[0]?.count || '0')

    return NextResponse.json({
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error: any) {
    console.error('[orders GET] Exception:', error)
    return NextResponse.json({ error: 'Failed to retrieve orders' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { shipping, items, payment_method } = body

    // 1. Validate shipping address fields
    if (!shipping || typeof shipping !== 'object') {
      return NextResponse.json({ error: 'Shipping details are required' }, { status: 400 })
    }

    const { name, phone, address, city, state, pincode } = shipping

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }
    if (!phone || !/^[6-9]\d{9}$/.test(String(phone).trim())) {
      return NextResponse.json({ error: 'Valid 10-digit Indian mobile number is required' }, { status: 400 })
    }
    if (!address || !address.trim()) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }
    if (!city || !city.trim()) {
      return NextResponse.json({ error: 'City is required' }, { status: 400 })
    }
    if (!state || !state.trim()) {
      return NextResponse.json({ error: 'State selection is required' }, { status: 400 })
    }
    if (!pincode || !/^\d{6}$/.test(String(pincode).trim())) {
      return NextResponse.json({ error: 'Valid 6-digit PIN code is required' }, { status: 400 })
    }

    // 2. Validate cart items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Your cart is empty' }, { status: 400 })
    }

    // Extract product IDs
    const productIds = items
      .map((item: { product_id?: number }) => item.product_id)
      .filter((id: number | undefined): id is number => typeof id === 'number' && id > 0)

    type ProductRow = {
      id: number
      name: string
      price: string
      discount_price: string | null
      stock: number
      size_stock: Record<string, number> | string | null
    }

    const productMap = new Map<number, ProductRow>()

    if (productIds.length > 0) {
      const dbProducts = await sql<ProductRow[]>`
        SELECT id, name, price, discount_price, stock, size_stock
        FROM products
        WHERE id = ANY(${productIds}::int[])
      `
      for (const p of dbProducts) {
        // Postgres may return size_stock as a JSON string — parse it if so
        if (typeof p.size_stock === 'string') {
          try {
            p.size_stock = JSON.parse(p.size_stock) as Record<string, number>
          } catch {
            p.size_stock = null
          }
        }
        productMap.set(p.id, p)
      }
    }

    // 3. Verify stock and calculate canonical price server-side
    let subtotal = 0

    for (const item of items as Array<{
      product_id?: number
      product_name: string
      price: number
      quantity: number
      size?: string
    }>) {
      const qty = Math.floor(Number(item.quantity) || 0)
      if (qty <= 0) {
        return NextResponse.json({ error: 'Invalid item quantity' }, { status: 400 })
      }

      if (item.product_id) {
        const product = productMap.get(item.product_id)
        if (!product) {
          return NextResponse.json(
            { error: `Product "${item.product_name}" is no longer available` },
            { status: 400 }
          )
        }

        // Check stock for item / size using canonical inventory utility
        const availStock = getAvailableStockForSize(product.stock, product.size_stock, item.size)
        if (availStock < qty) {
          return NextResponse.json(
            { error: `Insufficient available stock for "${product.name}"${item.size ? ` (Size ${item.size})` : ''}. Available: ${availStock}, Requested: ${qty}` },
            { status: 400 }
          )
        }

        // Canonical price from DB
        const canonicalPrice = product.discount_price
          ? parseFloat(product.discount_price)
          : parseFloat(product.price)

        subtotal += canonicalPrice * qty
      } else {
        subtotal += Number(item.price || 0) * qty
      }
    }

    const shippingCost = 0
    const total = subtotal + shippingCost
    const method = payment_method || 'Razorpay'

    // 4. Create pending order in database
    const orderId = await sql.begin(async (txSql) => {
      const orders = await txSql`
        INSERT INTO orders (
          user_id, status, subtotal, shipping_cost, total,
          payment_method, payment_status,
          shipping_name, shipping_phone,
          shipping_address, shipping_address2, shipping_landmark,
          shipping_city, shipping_district, shipping_state, shipping_pincode, shipping_zip, shipping_country
        ) VALUES (
          ${user.id}, 'pending', ${subtotal}, ${shippingCost}, ${total},
          ${method}, 'pending',
          ${shipping.name.trim()}, ${shipping.phone.trim()},
          ${shipping.address.trim()}, ${shipping.address2?.trim() || null}, ${shipping.landmark?.trim() || null},
          ${shipping.city.trim()}, ${shipping.district?.trim() || null}, ${shipping.state.trim()},
          ${shipping.pincode.trim()}, ${shipping.pincode.trim()}, ${shipping.country?.trim() || 'India'}
        )
        RETURNING id
      `
      const newOrderId = orders[0].id

      const orderItemRows = (items as Array<{
        product_id?: number
        product_name: string
        product_image?: string
        price: number
        quantity: number
        size?: string
      }>).map(item => {
        const qty = Math.floor(Number(item.quantity) || 1)
        let storedPrice = Number(item.price || 0)

        if (item.product_id && productMap.has(item.product_id)) {
          const product = productMap.get(item.product_id)!
          storedPrice = product.discount_price
            ? parseFloat(product.discount_price)
            : parseFloat(product.price)
        }

        return {
          order_id: newOrderId,
          product_id: item.product_id || null,
          product_name: item.product_name,
          product_image: item.product_image || null,
          price: storedPrice,
          quantity: qty,
          size: item.size || null,
        }
      })

      if (orderItemRows.length > 0) {
        await txSql`
          INSERT INTO order_items ${txSql(orderItemRows, 'order_id', 'product_id', 'product_name', 'product_image', 'price', 'quantity', 'size')}
        `
      }

      return newOrderId
    })

    return NextResponse.json({ orderId })
  } catch (error: any) {
    console.error('[orders POST] Unhandled exception:', error)
    return NextResponse.json(
      { error: error?.message || 'We could not start your payment. Please try again.' },
      { status: 500 }
    )
  }
}
