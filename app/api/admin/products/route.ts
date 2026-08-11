import { type NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
    const offset = (page - 1) * limit

    const products = await sql`
      SELECT p.*, c.name as category_name FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const countRes = await sql`SELECT COUNT(*) FROM products`
    const total = parseInt(countRes[0]?.count || '0')

    return NextResponse.json({
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'error'
    if (msg === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized access. Admin login required.' }, { status: 401 })
    }
    if (msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 })
    }
    console.error('[admin/products GET] unexpected error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    
    let data: any
    try {
      data = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 })
    }

    // --- Input Validation & Type Sanitization ---
    const name = typeof data.name === 'string' ? data.name.trim() : ''
    const price = typeof data.price === 'number' ? data.price : parseFloat(data.price)
    
    if (!name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
    }
    if (isNaN(price) || price < 0) {
      return NextResponse.json({ error: 'Valid positive price is required' }, { status: 400 })
    }

    const description = typeof data.description === 'string' && data.description.trim() ? data.description.trim() : null
    const discount_price = data.discount_price !== null && data.discount_price !== undefined && !isNaN(parseFloat(data.discount_price)) ? parseFloat(data.discount_price) : null
    const category_id = data.category_id && !isNaN(parseInt(data.category_id)) ? parseInt(data.category_id) : null
    const sizeStockObj = typeof data.size_stock === 'object' && data.size_stock !== null ? data.size_stock : {}
    const stock = Object.values(sizeStockObj).reduce((acc: number, curr: any) => acc + Math.max(0, parseInt(curr) || 0), 0)
    const images = Array.isArray(data.images) ? data.images.filter((img: any) => typeof img === 'string' && img.trim()) : []
    const sizes = Array.isArray(data.sizes) ? data.sizes.filter((s: any) => typeof s === 'string' && s.trim()) : []

    const productDetailsJson = JSON.stringify(typeof data.product_details === 'object' && data.product_details !== null ? data.product_details : {})
    const sizeStockJson = JSON.stringify(sizeStockObj)

    const is_featured = Boolean(data.is_featured)
    const is_best_seller = Boolean(data.is_best_seller)

    const products = await sql`
      INSERT INTO products (
        name, description, price, discount_price, category_id, images, stock, sizes,
        product_details, size_stock, is_featured, is_best_seller
      )
      VALUES (
        ${name}, ${description}, ${price}, ${discount_price},
        ${category_id}, ${images}, ${stock},
        ${sizes}, ${productDetailsJson}::jsonb, ${sizeStockJson}::jsonb,
        ${is_featured}, ${is_best_seller}
      )
      RETURNING *
    `

    // Revalidate paths for ISR
    revalidatePath('/')
    revalidatePath('/products')
    revalidatePath('/shop')

    return NextResponse.json({ product: products[0] })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'error'
    if (msg === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized access. Admin login required.' }, { status: 401 })
    }
    if (msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 })
    }
    console.error('[admin/products POST] unexpected error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
