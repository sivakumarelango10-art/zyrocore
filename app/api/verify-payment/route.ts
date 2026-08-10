import { type NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { env } from '@/lib/env'
import sql from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing required fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required' },
        { status: 400 }
      )
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || env.RAZORPAY_KEY_SECRET

    if (!keySecret) {
      console.error('[verify-payment] RAZORPAY_KEY_SECRET is missing')
      return NextResponse.json({ error: 'Server configuration error: missing secret key' }, { status: 500 })
    }

    // Step 3 HMAC-SHA256 signature verification
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    const expectedBuf = Buffer.from(generatedSignature, 'utf-8')
    const receivedBuf = Buffer.from(String(razorpay_signature), 'utf-8')

    if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      console.error('[verify-payment] Signature mismatch for order:', razorpay_order_id)
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature. Verification failed.' },
        { status: 400 }
      )
    }

    // Optional database integration if order_id is present
    if (order_id) {
      const user = await getSession()

      const existingOrders = await sql`
        SELECT id, payment_status FROM orders WHERE id = ${order_id} ${user ? sql`AND user_id = ${user.id}` : sql``} LIMIT 1
      `

      if (existingOrders.length > 0) {
        if (existingOrders[0].payment_status !== 'paid') {
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
              WHERE id = ${order_id}
            `

            const orderItems = await txSql`
              SELECT product_id, quantity FROM order_items WHERE order_id = ${order_id}
            `

            for (const item of orderItems) {
              if (item.product_id) {
                await txSql`
                  UPDATE products
                  SET stock = GREATEST(0, stock - ${item.quantity})
                  WHERE id = ${item.product_id}
                `
              }
            }

            if (user) {
              await txSql`DELETE FROM cart_items WHERE user_id = ${user.id}`
            }
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      razorpay_order_id,
      razorpay_payment_id,
    })
  } catch (error: any) {
    console.error('[verify-payment] Exception:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error during verification' },
      { status: 500 }
    )
  }
}
