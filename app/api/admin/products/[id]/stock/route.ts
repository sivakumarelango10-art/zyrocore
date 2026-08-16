import { type NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

/**
 * PATCH /api/admin/products/:id/stock
 *
 * Dedicated stock-only update endpoint.
 * Only modifies size_stock and stock columns — never touches product metadata.
 * This is the correct endpoint for Inventory page stock adjustments.
 *
 * Body: { size_stock: Record<string, number> }
 *   - Sizes present in the payload → updated to the provided quantity
 *   - Sizes NOT in the payload → preserved from the existing DB record
 *   - To remove a size, pass { remove_sizes: ["XL"] }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params
    const productId = parseInt(id)
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 })
    }

    const { size_stock: incomingSizeStock, remove_sizes: removeSizes, stock: directStock } = body

    // Support direct product stock integer update
    if (typeof directStock === 'number' && Number.isInteger(directStock) && directStock >= 0) {
      const updated = await sql`
        UPDATE products
        SET stock = ${directStock}, updated_at = NOW()
        WHERE id = ${productId}
        RETURNING *
      `
      revalidatePath('/')
      revalidatePath('/products')
      revalidatePath('/shop')
      revalidatePath(`/products/${productId}`)
      return NextResponse.json({ success: true, product: updated[0] })
    }

    if (
      !incomingSizeStock ||
      typeof incomingSizeStock !== 'object' ||
      Array.isArray(incomingSizeStock)
    ) {
      return NextResponse.json(
        { error: 'Provide stock number or size_stock object' },
        { status: 400 }
      )
    }

    // Validate all stock values are non-negative integers
    for (const [size, qty] of Object.entries(incomingSizeStock)) {
      const parsed = Number(qty)
      if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
        return NextResponse.json(
          { error: `Invalid stock quantity for size "${size}": must be a non-negative integer` },
          { status: 400 }
        )
      }
    }

    // Fetch the current product inside a transaction with row lock
    const updated = await sql.begin(async (txSql) => {
      const existing = await txSql`
        SELECT id, sizes, size_stock, stock FROM products WHERE id = ${productId} FOR UPDATE
      `

      if (existing.length === 0) {
        throw new Error('PRODUCT_NOT_FOUND')
      }

      const product = existing[0]

      // Parse current size_stock from DB (may come as object or string)
      let currentSizeStock: Record<string, number> = {}
      if (typeof product.size_stock === 'object' && product.size_stock !== null) {
        currentSizeStock = product.size_stock as Record<string, number>
      } else if (typeof product.size_stock === 'string') {
        try {
          currentSizeStock = JSON.parse(product.size_stock)
        } catch {
          currentSizeStock = {}
        }
      }

      // Parse current sizes array
      let currentSizes: string[] = Array.isArray(product.sizes) ? product.sizes : []

      // Merge: start with existing stock, apply updates
      const mergedSizeStock: Record<string, number> = { ...currentSizeStock }

      for (const [rawSize, qty] of Object.entries(incomingSizeStock)) {
        const size = String(rawSize).trim().toUpperCase()
        if (size) {
          mergedSizeStock[size] = Math.max(0, Math.floor(Number(qty) || 0))
        }
      }

      // Handle size removal (only if explicitly requested)
      const sizesToRemove: string[] = Array.isArray(removeSizes)
        ? removeSizes.map((s: any) => String(s).trim().toUpperCase()).filter(Boolean)
        : []

      for (const size of sizesToRemove) {
        delete mergedSizeStock[size]
      }

      // Rebuild sizes array from merged stock keys, preserving original order where possible
      const mergedSizeKeys = Object.keys(mergedSizeStock)
      const newSizes: string[] = [
        ...currentSizes.filter(s => mergedSizeKeys.includes(s)),
        ...mergedSizeKeys.filter(s => !currentSizes.includes(s)),
      ]

      // Calculate total stock as sum of all size quantities
      const totalStock = Object.values(mergedSizeStock).reduce(
        (acc, curr) => acc + Math.max(0, Number(curr) || 0),
        0
      )

      const sizeStockJson = JSON.stringify(mergedSizeStock)

      const result = await txSql`
        UPDATE products
        SET
          size_stock   = ${sizeStockJson}::jsonb,
          sizes        = ${newSizes},
          stock        = ${totalStock},
          updated_at   = NOW()
        WHERE id = ${productId}
        RETURNING *
      `

      return result[0]
    })

    revalidatePath('/')
    revalidatePath('/products')
    revalidatePath('/shop')
    revalidatePath(`/products/${productId}`)

    return NextResponse.json({ success: true, product: updated })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'error'
    if (msg === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized access. Admin login required.' }, { status: 401 })
    }
    if (msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 })
    }
    if (msg === 'PRODUCT_NOT_FOUND') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    console.error('[admin/products/[id]/stock PATCH] unexpected error:', error)
    return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 })
  }
}
