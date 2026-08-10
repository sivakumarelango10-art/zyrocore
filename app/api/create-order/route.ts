import { type NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { env } from '@/lib/env'
import sql from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { amount, currency = 'INR', receipt, order_id } = body

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID || 'rzp_test_TNwSqkorc3pJAL'
    const keySecret = process.env.RAZORPAY_KEY_SECRET || env.RAZORPAY_KEY_SECRET || 'xGzYghCi9qBcAUyib26Abor8'

    if (!keyId || !keySecret) {
      console.error('[create-order] Missing Razorpay API keys')
      return NextResponse.json({ error: 'Razorpay API credentials missing on server' }, { status: 500 })
    }

    let amountInPaise: number = 0
    let dbOrderId: number | string | undefined = order_id

    if (order_id) {
      const user = await getSession()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
      }

      const orders = await sql`
        SELECT id, total, user_id, status, payment_status
        FROM orders
        WHERE id = ${order_id} AND user_id = ${user.id}
        LIMIT 1
      `

      if (orders.length === 0) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      amountInPaise = Math.round(Number(orders[0].total) * 100)
    } else if (amount !== undefined) {
      amountInPaise = Number(amount)
      if (isNaN(amountInPaise) || amountInPaise < 100) {
        return NextResponse.json(
          { error: 'Invalid amount. Minimum amount is 100 paise (₹1.00).' },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Either amount (in paise) or order_id is required' },
        { status: 400 }
      )
    }

    if (amountInPaise < 100) {
      return NextResponse.json(
        { error: 'Minimum payment amount must be at least 100 paise' },
        { status: 400 }
      )
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: currency || 'INR',
      receipt: receipt || `rcpt_${dbOrderId || Date.now()}_${Math.floor(Math.random() * 1000)}`,
      notes: {
        ...(dbOrderId ? { order_id: String(dbOrderId) } : {}),
      },
    })

    if (dbOrderId) {
      await sql`
        UPDATE orders
        SET razorpay_order_id = ${rzpOrder.id},
            payment_method = 'Razorpay'
        WHERE id = ${dbOrderId}
      `
    }

    return NextResponse.json({
      order_id: rzpOrder.id,
      id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      receipt: rzpOrder.receipt,
      key_id: keyId,
    })
  } catch (error: any) {
    console.error('[create-order] Exception:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create Razorpay order' },
      { status: 500 }
    )
  }
}
