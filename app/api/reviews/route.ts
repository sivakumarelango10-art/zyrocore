import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const productIdStr = searchParams.get('product_id')

    if (!productIdStr) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    const productId = parseInt(productIdStr)

    const user = await getSession()

    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
    const offset = (page - 1) * limit

    // Fetch reviews with user details
    const reviews = await sql`
      SELECT 
        r.id, r.user_id, r.product_id, r.rating, r.title, r.comment, r.images, r.is_verified, r.created_at,
        u.name as user_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ${productId}
      ORDER BY r.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const [stats] = await sql`
      SELECT
        COUNT(*)::int AS total_reviews,
        COALESCE(AVG(rating), 0) AS average_rating,
        COUNT(*) FILTER (WHERE rating = 5)::int AS r5,
        COUNT(*) FILTER (WHERE rating = 4)::int AS r4,
        COUNT(*) FILTER (WHERE rating = 3)::int AS r3,
        COUNT(*) FILTER (WHERE rating = 2)::int AS r2,
        COUNT(*) FILTER (WHERE rating = 1)::int AS r1
      FROM reviews
      WHERE product_id = ${productId}
    `

    const userReviewRows = user
      ? await sql`
        SELECT 
          r.id, r.user_id, r.rating, r.title, r.comment, r.images, r.is_verified, r.created_at,
          u.name as user_name
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.product_id = ${productId} AND r.user_id = ${user.id}
        LIMIT 1
      `
      : []

    const totalReviews = parseInt(stats.total_reviews)
    const averageRating = parseFloat(Number(stats.average_rating).toFixed(1))
    const breakdown = {
      5: parseInt(stats.r5),
      4: parseInt(stats.r4),
      3: parseInt(stats.r3),
      2: parseInt(stats.r2),
      1: parseInt(stats.r1),
    }
    const userReview = userReviewRows[0]
      ? {
        id: userReviewRows[0].id,
        user_id: userReviewRows[0].user_id,
        user_name: userReviewRows[0].user_name,
        rating: userReviewRows[0].rating,
        title: userReviewRows[0].title,
        comment: userReviewRows[0].comment,
        images: userReviewRows[0].images || [],
        is_verified: userReviewRows[0].is_verified,
        created_at: userReviewRows[0].created_at,
      }
      : null

    return NextResponse.json({
      reviews: reviews.map(r => ({
        id: r.id,
        user_id: r.user_id,
        user_name: r.user_name,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        images: r.images || [],
        is_verified: r.is_verified,
        created_at: r.created_at,
      })),
      totalReviews,
      averageRating,
      breakdown,
      userReview,
      page,
      totalPages: Math.ceil(totalReviews / limit),
    })
  } catch (error) {
    console.error('[reviews GET] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Please log in to submit a review.' }, { status: 401 })
    }

    const { product_id, rating, title, comment, images } = await req.json()

    if (!product_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Valid product ID and star rating (1-5) are required.' }, { status: 400 })
    }

    // Check if user has purchased & received this product for verified purchase badge
    const deliveredOrders = await sql`
      SELECT o.id
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ${user.id}
        AND oi.product_id = ${product_id}
        AND o.status IN ('delivered', 'confirmed', 'shipped')
      LIMIT 1
    `
    const isVerified = deliveredOrders.length > 0

    // Upsert review record
    await sql`
      INSERT INTO reviews (user_id, product_id, rating, title, comment, images, is_verified, updated_at)
      VALUES (${user.id}, ${product_id}, ${rating}, ${title || null}, ${comment || null}, ${images || []}, ${isVerified}, NOW())
      ON CONFLICT (user_id, product_id)
      DO UPDATE SET
        rating = EXCLUDED.rating,
        title = EXCLUDED.title,
        comment = EXCLUDED.comment,
        images = EXCLUDED.images,
        is_verified = EXCLUDED.is_verified,
        updated_at = NOW()
    `

    // Update product rating and rating_count metrics
    const [stats] = await sql`
      SELECT COUNT(*) as count, COALESCE(AVG(rating), 0) as avg_rating
      FROM reviews
      WHERE product_id = ${product_id}
    `
    const count = parseInt(stats.count)
    const avg = parseFloat(parseFloat(stats.avg_rating).toFixed(2))

    await sql`
      UPDATE products
      SET rating = ${avg}, rating_count = ${count}
      WHERE id = ${product_id}
    `

    return NextResponse.json({ success: true, rating: avg, rating_count: count })
  } catch (error) {
    console.error('[reviews POST] error:', error)
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const productIdStr = searchParams.get('product_id')
    if (!productIdStr) return NextResponse.json({ error: 'Product ID required' }, { status: 400 })

    const productId = parseInt(productIdStr)

    await sql`
      DELETE FROM reviews
      WHERE user_id = ${user.id} AND product_id = ${productId}
    `

    // Recalculate product rating metrics
    const [stats] = await sql`
      SELECT COUNT(*) as count, COALESCE(AVG(rating), 0) as avg_rating
      FROM reviews
      WHERE product_id = ${productId}
    `
    const count = parseInt(stats.count)
    const avg = parseFloat(parseFloat(stats.avg_rating).toFixed(2))

    await sql`
      UPDATE products
      SET rating = ${avg}, rating_count = ${count}
      WHERE id = ${productId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[reviews DELETE] error:', error)
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
  }
}
