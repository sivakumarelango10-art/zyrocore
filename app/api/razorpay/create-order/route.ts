import { type NextRequest, NextResponse } from 'next/server'
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
    const { order_id } = body

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
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

    const order = orders[0]
    const amountInPaise = Math.round(Number(order.total) * 100)

    // Read Razorpay API credentials directly from environment variables (.env / Vercel env)
    const clean = (val?: string) => {
      if (!val) return ''
      let s = val.trim()
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.substring(1, s.length - 1).trim()
      }
      return s
    }

    const keyId = clean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID)
    const keySecret = clean(process.env.RAZORPAY_KEY_SECRET || env.RAZORPAY_KEY_SECRET)

    if (!keyId || !keySecret) {
      console.error('[razorpay/create-order] Missing API keys. Key ID configured?:', Boolean(keyId), 'Key Secret configured?:', Boolean(keySecret))
      return NextResponse.json({ error: 'Razorpay API keys are not configured in environment variables' }, { status: 500 })
    }

    console.log('[razorpay/create-order] Creating order with Key ID:', `${keyId.substring(0, 10)}...${keyId.substring(keyId.length - 4)}`, 'Secret length:', keySecret.length)

    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64')

    const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `rcpt_${order.id}_${Date.now()}`,
        notes: {
          order_id: String(order.id),
          user_id: String(user.id),
        },
      }),
    })

    const rzpData = await razorpayRes.json()

    if (!razorpayRes.ok) {
      console.error('[razorpay/create-order] Error from Razorpay API:', rzpData)
      const errorMsg =
        typeof rzpData.error === 'string'
          ? rzpData.error
          : rzpData.error?.description || 'Failed to create Razorpay order'

      return NextResponse.json({ error: errorMsg }, { status: 400 })
    }

    await sql`
      UPDATE orders
      SET razorpay_order_id = ${rzpData.id},
          payment_method = 'Razorpay'
      WHERE id = ${order.id}
    `

    return NextResponse.json({
      id: rzpData.id,
      amount: rzpData.amount,
      currency: rzpData.currency,
      order_id: order.id,
      key_id: keyId,
    })
  } catch (error: any) {
    console.error('[razorpay/create-order] Exception:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
