import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import sql from '@/lib/db'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rows = await sql`
      SELECT id, upi_id, qr_image_url, business_name, razorpay_key_id,
             CASE WHEN razorpay_key_secret IS NOT NULL AND razorpay_key_secret != '' THEN true ELSE false END as has_razorpay_secret,
             is_active, created_at
      FROM payment_settings
      WHERE is_active = true
      ORDER BY id DESC
      LIMIT 1
    `
    const settings = rows[0] ?? null

    const envKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || ''
    const envKeySecret = process.env.RAZORPAY_KEY_SECRET || ''

    return NextResponse.json({
      settings: {
        ...(settings || {}),
        env_key_id: envKeyId ? `${envKeyId.slice(0, 8)}...${envKeyId.slice(-4)}` : null,
        env_key_secret_set: Boolean(envKeySecret),
      },
    })
  } catch (error) {
    console.error('[admin/payment-settings GET] error:', error)
    return NextResponse.json({ error: 'Failed to retrieve payment settings' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { upi_id, qr_image_url, business_name, razorpay_key_id, razorpay_key_secret } = body

    // Fetch existing active secret so it's not unintentionally cleared when blank
    const existingRows = await sql`SELECT razorpay_key_secret FROM payment_settings WHERE is_active = true ORDER BY id DESC LIMIT 1`
    const existingSecret = existingRows[0]?.razorpay_key_secret || null

    const finalSecret = razorpay_key_secret && String(razorpay_key_secret).trim() !== ''
      ? String(razorpay_key_secret).trim()
      : existingSecret

    // Deactivate old settings
    await sql`UPDATE payment_settings SET is_active = false`
    const rows = await sql`
      INSERT INTO payment_settings (upi_id, qr_image_url, business_name, razorpay_key_id, razorpay_key_secret, is_active)
      VALUES (
        ${upi_id ? String(upi_id).trim() : null},
        ${qr_image_url ? String(qr_image_url).trim() : null},
        ${business_name ? String(business_name).trim() : null},
        ${razorpay_key_id ? String(razorpay_key_id).trim() : null},
        ${finalSecret},
        true
      )
      RETURNING id, upi_id, qr_image_url, business_name, razorpay_key_id,
                CASE WHEN razorpay_key_secret IS NOT NULL AND razorpay_key_secret != '' THEN true ELSE false END as has_razorpay_secret,
                is_active, created_at
    `
    return NextResponse.json({ settings: rows[0] })
  } catch (error) {
    console.error('[admin/payment-settings POST] error:', error)
    return NextResponse.json({ error: 'Failed to save payment settings' }, { status: 500 })
  }
}
