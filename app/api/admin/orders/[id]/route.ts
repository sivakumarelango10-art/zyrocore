import { type NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const orderIdNum = parseInt(id)
    if (isNaN(orderIdNum)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
    }

    const orders = await sql`
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ${orderIdNum}
      LIMIT 1
    `

    if (orders.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const items = await sql`
      SELECT oi.*, p.images as product_images
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ${orderIdNum}
    `

    return NextResponse.json({ order: { ...orders[0], items } })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'error'
    if (msg === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const orderIdNum = parseInt(id)
    if (isNaN(orderIdNum)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const { status, tracking_number, courier_name, tracking_url } = body

    let cleanTrackingUrl: string | null | undefined = undefined
    if (tracking_url !== undefined) {
      if (tracking_url === null || tracking_url === '') {
        cleanTrackingUrl = null
      } else if (typeof tracking_url === 'string') {
        let trimmedUrl = tracking_url.trim()
        if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
          trimmedUrl = `https://${trimmedUrl}`
        }
        try {
          const parsed = new URL(trimmedUrl)
          if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return NextResponse.json({ error: 'Tracking URL must use a safe http/https protocol.' }, { status: 400 })
          }
          cleanTrackingUrl = parsed.toString()
        } catch {
          return NextResponse.json({ error: 'Invalid tracking URL format.' }, { status: 400 })
        }
      } else {
        return NextResponse.json({ error: 'Invalid tracking URL format.' }, { status: 400 })
      }
    }

    // Auto-transform status to 'shipped' when tracking details are entered (unless explicitly set or already delivered/cancelled)
    let nextStatus: string | null = status || null
    const hasTrackingData = (tracking_number !== undefined && tracking_number !== null && tracking_number !== '') ||
                            (courier_name !== undefined && courier_name !== null && courier_name !== '') ||
                            (cleanTrackingUrl !== undefined && cleanTrackingUrl !== null)

    if (!nextStatus && hasTrackingData) {
      const existing = await sql`SELECT status FROM orders WHERE id = ${orderIdNum} LIMIT 1`
      if (existing.length > 0 && existing[0].status !== 'delivered' && existing[0].status !== 'cancelled') {
        nextStatus = 'shipped'
      }
    }

    const updated = await sql`
      UPDATE orders
      SET
        status = COALESCE(${nextStatus}, status),
        tracking_number = ${tracking_number !== undefined ? (tracking_number || null) : sql`tracking_number`},
        courier_name = ${courier_name !== undefined ? (courier_name || null) : sql`courier_name`},
        tracking_url = ${cleanTrackingUrl !== undefined ? cleanTrackingUrl : sql`tracking_url`},
        updated_at = NOW()
      WHERE id = ${orderIdNum}
      RETURNING *
    `

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, order: updated[0] })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'error'
    if (msg === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[admin/orders/[id] PATCH] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
