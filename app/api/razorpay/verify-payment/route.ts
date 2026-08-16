import { type NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import sql from '@/lib/db'
import { getSession } from '@/lib/auth'
import { env } from '@/lib/env'
import { revalidatePath } from 'next/cache'

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

    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || env.RAZORPAY_KEY_SECRET

    if (!keySecret) {
      return NextResponse.json({ error: 'Razorpay Key Secret is not configured in environment variables' }, { status: 500 })
    }

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

    // 3. Atomically update order status & deduct stock with row-level locking
    try {
      const result = await sql.begin(async (txSql) => {
        const orderItems = await txSql`
          SELECT product_id, quantity, size FROM order_items WHERE order_id = ${order_id}
        `

        // Step A: Lock and validate all products/sizes before deducting stock
        for (const item of orderItems) {
          if (!item.product_id) continue

          const lockedProduct = await txSql`
            SELECT id, name, stock, size_stock FROM products WHERE id = ${item.product_id} FOR UPDATE
          `

          if (lockedProduct.length === 0) {
            throw new Error(`PRODUCT_NOT_FOUND:${item.product_id}`)
          }

          const product = lockedProduct[0]
          const reqQty = Number(item.quantity) || 1

          if (Number(product.stock) < reqQty) {
            throw new Error(`INSUFFICIENT_STOCK:${product.name} (Available: ${product.stock}, Requested: ${reqQty})`)
          }

          if (item.size) {
            const normSize = String(item.size).trim().toUpperCase()
            let sizeStockMap: Record<string, number> = {}
            if (typeof product.size_stock === 'object' && product.size_stock !== null) {
              sizeStockMap = product.size_stock as Record<string, number>
            } else if (typeof product.size_stock === 'string') {
              try {
                sizeStockMap = JSON.parse(product.size_stock)
              } catch { }
            }

            const matchedKey = Object.keys(sizeStockMap).find(k => k.trim().toUpperCase() === normSize) || normSize
            const availForSize = Math.max(0, Number(sizeStockMap[matchedKey]) || 0)
            if (availForSize < reqQty) {
              throw new Error(`INSUFFICIENT_SIZE_STOCK:${product.name} Size ${normSize} (Available: ${availForSize}, Requested: ${reqQty})`)
            }
          }
        }

        // Step B: Atomically deduct stock for validated items using row-level compare-and-swap
        for (const item of orderItems) {
          if (!item.product_id) continue
          const reqQty = Number(item.quantity) || 1

          if (item.size) {
            const normSize = String(item.size).trim().toUpperCase()
            // Deduct size-specific stock and recalculate total stock from sum of all sizes
            const updated = await txSql`
              UPDATE products
              SET size_stock = jsonb_set(
                    COALESCE(size_stock, '{}'::jsonb),
                    ARRAY[${normSize}]::text[],
                    to_jsonb(GREATEST(0, COALESCE((size_stock->>${normSize})::int, COALESCE((size_stock->>${normSize.toLowerCase()})::int, 0)) - ${reqQty}))
                  ),
                  -- Recalculate total stock as sum of all size_stock values after deduction
                  stock = GREATEST(0, (
                    SELECT COALESCE(SUM(val::int), 0)
                    FROM jsonb_each_text(
                      jsonb_set(
                        COALESCE(size_stock, '{}'::jsonb),
                        ARRAY[${normSize}]::text[],
                        to_jsonb(GREATEST(0, COALESCE((size_stock->>${normSize})::int, COALESCE((size_stock->>${normSize.toLowerCase()})::int, 0)) - ${reqQty}))
                      )
                    ) AS t(key, val)
                  )),
                  updated_at = NOW()
              WHERE id = ${item.product_id}
                AND (
                  COALESCE((size_stock->>${normSize})::int, 0) >= ${reqQty}
                  OR COALESCE((size_stock->>${normSize.toLowerCase()})::int, 0) >= ${reqQty}
                )
              RETURNING id
            `

            if (updated.length === 0) {
              throw new Error(`INSUFFICIENT_STOCK:Stock changed during checkout for product #${item.product_id}`)
            }
          } else {
            const updated = await txSql`
              UPDATE products
              SET stock = stock - ${reqQty},
                  updated_at = NOW()
              WHERE id = ${item.product_id} AND stock >= ${reqQty}
              RETURNING id
            `

            if (updated.length === 0) {
              throw new Error(`INSUFFICIENT_STOCK:Stock changed during checkout for product #${item.product_id}`)
            }
          }

          try {
            revalidatePath('/')
            revalidatePath('/products')
            revalidatePath('/shop')
            revalidatePath(`/products/${item.product_id}`)
          } catch (revalErr) {
            console.warn('[verify-payment] Revalidation warning:', revalErr)
          }
        }

        // Step C: Mark order paid & confirmed
        await txSql`
          UPDATE orders
          SET payment_status = 'paid',
              status = 'confirmed',
              payment_method = 'Razorpay',
              razorpay_order_id = ${razorpay_order_id},
              razorpay_payment_id = ${razorpay_payment_id},
              razorpay_signature = ${razorpay_signature},
              updated_at = NOW()
          WHERE id = ${order_id} AND user_id = ${user.id}
        `

        // Step D: Check for low stock alerts post-deduction to include in report
        const lowStockAlerts: string[] = []
        for (const item of orderItems) {
          if (!item.product_id) continue
          const [updatedProd] = await txSql`
            SELECT id, name, stock, size_stock FROM products WHERE id = ${item.product_id}
          `
          if (updatedProd) {
            const curStock = Number(updatedProd.stock) || 0
            if (curStock <= 10) {
              lowStockAlerts.push(`Low Stock Warning: "${updatedProd.name}" (#${updatedProd.id}) overall stock is down to ${curStock} unit(s).`)
            }
            if (item.size) {
              const normSize = String(item.size).trim().toUpperCase()
              const sizeStockMap = typeof updatedProd.size_stock === 'object' && updatedProd.size_stock ? updatedProd.size_stock : {}
              const sizeQty = Number(sizeStockMap[normSize]) || 0
              if (sizeQty <= 5) {
                lowStockAlerts.push(`Size Restock Alert: "${updatedProd.name}" Size ${normSize} has only ${sizeQty} unit(s) remaining.`)
              }
            }
          }
        }

        // Clear cart items for user after successful payment
        await txSql`DELETE FROM cart_items WHERE user_id = ${user.id}`

        return { lowStockAlerts }
      })

      return NextResponse.json({
        success: true,
        order_id: order_id,
        message: 'Payment verified successfully',
        low_stock_alerts: result?.lowStockAlerts || [],
      })
    } catch (txError: any) {
      const msg = String(txError?.message || '')
      if (msg.startsWith('INSUFFICIENT_STOCK') || msg.startsWith('INSUFFICIENT_SIZE_STOCK')) {
        await sql`
          UPDATE orders
          SET payment_status = 'refund_required',
              status = 'cancelled',
              razorpay_order_id = ${razorpay_order_id},
              razorpay_payment_id = ${razorpay_payment_id},
              razorpay_signature = ${razorpay_signature},
              notes = ${`Payment received but item went out of stock. Refund required. Details: ${msg}`},
              updated_at = NOW()
          WHERE id = ${order_id} AND user_id = ${user.id}
        `
        return NextResponse.json(
          { error: 'Item stock is no longer available. Payment received and refund initiated.', refund_required: true },
          { status: 409 }
        )
      }
      throw txError
    }
  } catch (error: any) {
    console.error('[razorpay/verify-payment] Exception:', error)
    return NextResponse.json({ error: error?.message || 'Payment verification error' }, { status: 500 })
  }
}
