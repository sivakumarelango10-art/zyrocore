import { type NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

const VALID_SORTS = ['newest', 'price_asc', 'price_desc', 'rating'] as const
type SortOption = typeof VALID_SORTS[number]

const PRODUCT_COLUMNS = sql`
  p.id,
  p.name,
  p.description,
  p.price,
  p.discount_price,
  p.category_id,
  p.images,
  p.stock,
  p.rating,
  p.rating_count,
  p.is_featured,
  p.is_best_seller,
  p.show_on_home,
  p.created_at,
  c.name as category_name,
  c.slug as category_slug
`

function getOrderBy(sort: SortOption) {
  if (sort === 'price_asc') return sql`ORDER BY price ASC`
  if (sort === 'price_desc') return sql`ORDER BY price DESC`
  if (sort === 'rating') return sql`ORDER BY rating DESC`
  return sql`ORDER BY created_at DESC`
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured')
    const bestSeller = searchParams.get('best_seller')
    const showOnHome = searchParams.get('show_on_home')

    // Validate and sanitize sort parameter
    const rawSort = searchParams.get('sort') ?? 'newest'
    const sort: SortOption = VALID_SORTS.includes(rawSort as SortOption) ? (rawSort as SortOption) : 'newest'

    // Validate and sanitize pagination
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '12') || 12))
    const offset = (page - 1) * limit
    let whereSql = sql``
    if (search) {
      const searchTerm = `%${search}%`
      whereSql = sql`WHERE (p.name ILIKE ${searchTerm} OR p.description ILIKE ${searchTerm})`
    } else if (category) {
      whereSql = sql`WHERE c.slug = ${category}`
    } else if (featured === 'true') {
      whereSql = sql`WHERE p.is_featured = true`
    } else if (bestSeller === 'true') {
      whereSql = sql`WHERE p.is_best_seller = true`
    } else if (showOnHome === 'true') {
      whereSql = sql`WHERE p.show_on_home = true`
    }

    const orderBySql = getOrderBy(sort)

    const [products, countResult] = await Promise.all([
      sql`
        SELECT ${PRODUCT_COLUMNS}
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ${whereSql}
        ${orderBySql}
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`
        SELECT COUNT(*)::int AS total
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ${whereSql}
      `,
    ])

    const total = countResult[0]?.total ? Number(countResult[0].total) : 0

    return NextResponse.json(
      {
        products,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('Products GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
