import { type NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const productId = parseInt(id)
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
    }

    let data: any
    try {
      data = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 })
    }

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

    const updated = await sql`
      UPDATE products SET
        name = ${name},
        description = ${description},
        price = ${price},
        discount_price = ${discount_price},
        category_id = ${category_id},
        images = ${images},
        stock = ${stock},
        sizes = ${sizes},
        product_details = ${productDetailsJson}::jsonb,
        size_stock = ${sizeStockJson}::jsonb,
        is_featured = ${is_featured},
        is_best_seller = ${is_best_seller},
        updated_at = NOW()
      WHERE id = ${productId}
      RETURNING *
    `

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Revalidate paths for ISR
    revalidatePath('/')
    revalidatePath('/products')
    revalidatePath('/shop')
    revalidatePath(`/products/${productId}`)

    return NextResponse.json({ success: true, product: updated[0] })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'error'
    if (msg === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized access. Admin login required.' }, { status: 401 })
    }
    if (msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 })
    }
    console.error('[admin/products PUT] unexpected error:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const productId = parseInt(id)
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
    }

    const deleted = await sql`DELETE FROM products WHERE id = ${productId} RETURNING id`
    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Revalidate paths for ISR
    revalidatePath('/')
    revalidatePath('/products')
    revalidatePath('/shop')
    revalidatePath(`/products/${productId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'error'
    if (msg === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized access. Admin login required.' }, { status: 401 })
    }
    if (msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 })
    }
    console.error('[admin/products DELETE] unexpected error:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
