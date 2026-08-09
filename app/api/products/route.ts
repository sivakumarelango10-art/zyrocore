import { type NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

const VALID_SORTS = ['newest', 'price_asc', 'price_desc', 'rating'] as const
type SortOption = typeof VALID_SORTS[number]

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured')
    const bestSeller = searchParams.get('best_seller')

    // Validate and sanitize sort parameter
    const rawSort = searchParams.get('sort') ?? 'newest'
    const sort: SortOption = VALID_SORTS.includes(rawSort as SortOption) ? rawSort as SortOption : 'newest'

    // Validate and sanitize pagination
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '12') || 12))
    const offset = (page - 1) * limit

    let products
    let countResult

    if (search) {
      const searchTerm = `%${search}%`
      const base = sql`
        SELECT p.*, c.name as category_name, c.slug as category_slug
        FROM products p LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.name ILIKE ${searchTerm} OR p.description ILIKE ${searchTerm}
      `
      if (sort === 'price_asc') {
        products = await sql`${base} ORDER BY p.price ASC LIMIT ${limit} OFFSET ${offset}`
      } else if (sort === 'price_desc') {
        products = await sql`${base} ORDER BY p.price DESC LIMIT ${limit} OFFSET ${offset}`
      } else if (sort === 'rating') {
        products = await sql`${base} ORDER BY p.rating DESC LIMIT ${limit} OFFSET ${offset}`
      } else {
        products = await sql`${base} ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`
      }
      countResult = await sql`
        SELECT COUNT(*) FROM products
        WHERE name ILIKE ${searchTerm} OR description ILIKE ${searchTerm}
      `
    } else if (category) {
      const base = sql`
        SELECT p.*, c.name as category_name, c.slug as category_slug
        FROM products p LEFT JOIN categories c ON p.category_id = c.id
        WHERE c.slug = ${category}
      `
      if (sort === 'price_asc') {
        products = await sql`${base} ORDER BY p.price ASC LIMIT ${limit} OFFSET ${offset}`
      } else if (sort === 'price_desc') {
        products = await sql`${base} ORDER BY p.price DESC LIMIT ${limit} OFFSET ${offset}`
      } else if (sort === 'rating') {
        products = await sql`${base} ORDER BY p.rating DESC LIMIT ${limit} OFFSET ${offset}`
      } else {
        products = await sql`${base} ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`
      }
      countResult = await sql`
        SELECT COUNT(*) FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE c.slug = ${category}
      `
    } else if (featured === 'true') {
      const base = sql`
        SELECT p.*, c.name as category_name, c.slug as category_slug
        FROM products p LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_featured = true
      `
      if (sort === 'price_asc') {
        products = await sql`${base} ORDER BY p.price ASC LIMIT ${limit} OFFSET ${offset}`
      } else if (sort === 'price_desc') {
        products = await sql`${base} ORDER BY p.price DESC LIMIT ${limit} OFFSET ${offset}`
      } else if (sort === 'rating') {
        products = await sql`${base} ORDER BY p.rating DESC LIMIT ${limit} OFFSET ${offset}`
      } else {
        products = await sql`${base} ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`
      }
      countResult = await sql`SELECT COUNT(*) FROM products WHERE is_featured = true`
    } else if (bestSeller === 'true') {
      const base = sql`
        SELECT p.*, c.name as category_name, c.slug as category_slug
        FROM products p LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_best_seller = true
      `
      if (sort === 'price_asc') {
        products = await sql`${base} ORDER BY p.price ASC LIMIT ${limit} OFFSET ${offset}`
      } else if (sort === 'price_desc') {
        products = await sql`${base} ORDER BY p.price DESC LIMIT ${limit} OFFSET ${offset}`
      } else if (sort === 'rating') {
        products = await sql`${base} ORDER BY p.rating DESC LIMIT ${limit} OFFSET ${offset}`
      } else {
        products = await sql`${base} ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`
      }
      countResult = await sql`SELECT COUNT(*) FROM products WHERE is_best_seller = true`
    } else {
      const base = sql`
        SELECT p.*, c.name as category_name, c.slug as category_slug
        FROM products p LEFT JOIN categories c ON p.category_id = c.id
      `
      if (sort === 'price_asc') {
        products = await sql`${base} ORDER BY p.price ASC LIMIT ${limit} OFFSET ${offset}`
      } else if (sort === 'price_desc') {
        products = await sql`${base} ORDER BY p.price DESC LIMIT ${limit} OFFSET ${offset}`
      } else if (sort === 'rating') {
        products = await sql`${base} ORDER BY p.rating DESC LIMIT ${limit} OFFSET ${offset}`
      } else {
        products = await sql`${base} ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`
      }
      countResult = await sql`SELECT COUNT(*) FROM products`
    }

    const total = parseInt(countResult[0].count)

    return NextResponse.json(
      {
        products,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    console.error('Products GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

