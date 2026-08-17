import { type NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/**
 * GET /api/admin/inventory
 *
 * Returns a lightweight product list for the Inventory management view.
 * Only fetches the fields needed for stock display — no heavy joins.
 * Results are sorted by product name for consistent display.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim() || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50))
    const offset = (page - 1) * limit

    const [products, countResult] = search
      ? await Promise.all([
          sql`
            SELECT
              p.id,
              p.name,
              p.images,
              p.sizes,
              p.size_stock,
              p.stock,
              c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.name ILIKE ${'%' + search + '%'}
               OR c.name ILIKE ${'%' + search + '%'}
            ORDER BY p.name ASC
            LIMIT ${limit} OFFSET ${offset}
          `,
          sql`
            SELECT COUNT(*)::int AS total
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.name ILIKE ${'%' + search + '%'}
               OR c.name ILIKE ${'%' + search + '%'}
          `,
        ])
      : await Promise.all([
          sql`
            SELECT
              p.id,
              p.name,
              p.images,
              p.sizes,
              p.size_stock,
              p.stock,
              c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.name ASC
            LIMIT ${limit} OFFSET ${offset}
          `,
          sql`SELECT COUNT(*)::int AS total FROM products`,
        ])

    const total = Number(countResult[0]?.total || 0)

    // Normalize size_stock to always be a plain object on the response
    const normalized = products.map((p: any) => {
      let sizeStock: Record<string, number> = {}
      if (typeof p.size_stock === 'object' && p.size_stock !== null) {
        sizeStock = p.size_stock
      } else if (typeof p.size_stock === 'string') {
        try { sizeStock = JSON.parse(p.size_stock) } catch { sizeStock = {} }
      }
      return { ...p, size_stock: sizeStock }
    })

    return NextResponse.json({
      products: normalized,
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
    console.error('[admin/inventory GET] unexpected error:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
}
