import { type NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import sql from '@/lib/db'
import { getSession } from '@/lib/auth'
import { env } from '@/lib/env'
import { revalidatePath } from 'next/cache'
import { getAvailableStockForSize } from '@/lib/inventory-utils'

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

    let rawKeySecret = process.env.RAZORPAY_KEY_SECRET || env.RAZORPAY_KEY_SECRET || ''
    rawKeySecret = rawKeySecret.trim()
    if ((rawKeySecret.startsWith('"') && rawKeySecret.endsWith('"')) || (rawKeySecret.startsWith("'") && rawKeySecret.endsWith("'"))) {
      rawKeySecret = rawKeySecret.substring(1, rawKeySecret.length - 1).trim()
    }
    const keySecret = rawKeySecret

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
          const reqQty = Math.max(1, Number(item.quantity) || 1)
          const availStock = getAvailableStockForSize(product.stock, product.size_stock, item.size)

          if (availStock < reqQty) {
            throw new Error(`INSUFFICIENT_STOCK:${product.name} (Available: ${availStock}, Requested: ${reqQty})`)
          }
        }

        // Step B: Atomically deduct stock for validated items
        for (const item of orderItems) {
          if (!item.product_id) continue
          const reqQty = Math.max(1, Number(item.quantity) || 1)

          const [currentProd] = await txSql`
            SELECT id, name, stock, size_stock FROM products WHERE id = ${item.product_id}
          `
          if (!currentProd) continue

          let currentStock = Math.max(0, Number(currentProd.stock) || 0)
          let sizeStockMap: Record<string, number> = {}

          if (typeof currentProd.size_stock === 'object' && currentProd.size_stock !== null) {
            sizeStockMap = { ...currentProd.size_stock }
          } else if (typeof currentProd.size_stock === 'string') {
            try {
              sizeStockMap = JSON.parse(currentProd.size_stock)
            } catch {
              sizeStockMap = {}
            }
          }

          const keys = Object.keys(sizeStockMap)
          if (item.size && keys.length > 0) {
            const normTarget = String(item.size).trim().toUpperCase()
            const matchedKey = keys.find(k => String(k).trim().toUpperCase() === normTarget)

            if (matchedKey) {
              const currentSizeQty = Math.max(0, Number(sizeStockMap[matchedKey]) || 0)
              sizeStockMap[matchedKey] = Math.max(0, currentSizeQty - reqQty)
              // Recalculate total stock as sum of size_stock values if size_stock is fully configured
              const sumSizeStock = Object.values(sizeStockMap).reduce((acc, val) => acc + Math.max(0, Number(val) || 0), 0)
              currentStock = sumSizeStock
            } else {
              currentStock = Math.max(0, currentStock - reqQty)
            }
          } else {
            currentStock = Math.max(0, currentStock - reqQty)
          }

          await txSql`
            UPDATE products
            SET stock = ${currentStock},
                size_stock = ${JSON.stringify(sizeStockMap)}::jsonb,
                updated_at = NOW()
            WHERE id = ${item.product_id}
          `

          try {
            revalidatePath('/')
            revalidatePath('/products')
            revalidatePath('/shop')
            revalidatePath(`/products/${item.product_id}`)
            revalidatePath('/orders')
            revalidatePath('/secure-admin/orders')
            revalidatePath('/secure-admin/inventory')
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
