import { type NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import sql from '@/lib/db'
import { getSession } from '@/lib/auth'
import { env } from '@/lib/env'

export async function POST(req: NextRequest) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_id) {
      return NextResponse.json({ error: 'Missing required Razorpay payment details' }, { status: 400 })
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || env.RAZORPAY_KEY_SECRET || 'xGzYghCi9qBcAUyib26Abor8'

    // 1. Timing-safe HMAC SHA-256 Signature Verification
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    const expectedBuf = Buffer.from(expectedSignature, 'utf-8')
    const receivedBuf = Buffer.from(String(razorpay_signature), 'utf-8')

    if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      console.error('[razorpay/verify-payment] Signature verification failed for order', order_id)
      return NextResponse.json({ error: 'Payment signature verification failed' }, { status: 400 })
    }

    // 2. Check existing order
    const existingOrders = await sql`
      SELECT id, payment_status, user_id FROM orders WHERE id = ${order_id} AND user_id = ${user.id} LIMIT 1
    `

    if (existingOrders.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Prevent duplicate processing
    if (existingOrders[0].payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        order_id: existingOrders[0].id,
        message: 'Payment already verified',
      })
    }

    // 3. Atomically update order status & deduct stock
    await sql.begin(async (txSql) => {
      await txSql`
        UPDATE orders
        SET payment_status = 'paid',
            status = 'processing',
            payment_method = 'Razorpay',
            razorpay_order_id = ${razorpay_order_id},
            razorpay_payment_id = ${razorpay_payment_id},
            razorpay_signature = ${razorpay_signature},
            updated_at = NOW()
        WHERE id = ${order_id} AND user_id = ${user.id}
      `

      const orderItems = await txSql`
        SELECT product_id, quantity, size FROM order_items WHERE order_id = ${order_id}
      `

      for (const item of orderItems) {
        if (item.product_id) {
          await txSql`
            UPDATE products
            SET stock = GREATEST(0, stock - ${item.quantity})
            WHERE id = ${item.product_id}
          `

          if (item.size) {
            try {
              await txSql`
                UPDATE products
                SET size_stock = jsonb_set(
                  COALESCE(size_stock, '{}'::jsonb),
                  ARRAY[${item.size}]::text[],
                  to_jsonb(GREATEST(0, COALESCE((size_stock->>${item.size})::int, 0) - ${item.quantity}))
                )
                WHERE id = ${item.product_id}
              `
            } catch (err) {
              console.warn('[verify-payment] Non-fatal size_stock update warning:', err)
            }
          }
        }
      }

      // Clear cart items for user after successful payment
      await txSql`DELETE FROM cart_items WHERE user_id = ${user.id}`
    })

    return NextResponse.json({
      success: true,
      order_id: order_id,
      message: 'Payment verified successfully',
    })
  } catch (error: any) {
    console.error('[razorpay/verify-payment] Exception:', error)
    return NextResponse.json({ error: error?.message || 'Payment verification error' }, { status: 500 })
  }
}
