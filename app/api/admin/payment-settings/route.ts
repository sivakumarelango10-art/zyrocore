import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import sql from '@/lib/db'

async function ensurePaymentSettingsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS payment_settings (
      id SERIAL PRIMARY KEY,
      upi_id VARCHAR(255),
      qr_image_url TEXT,
      business_name VARCHAR(255),
      razorpay_key_id VARCHAR(255),
      razorpay_key_secret VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS razorpay_key_id VARCHAR(255)`
  await sql`ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS razorpay_key_secret VARCHAR(255)`
}

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensurePaymentSettingsTable()
  const rows = await sql`SELECT * FROM payment_settings WHERE is_active = true ORDER BY id DESC LIMIT 1`
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
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensurePaymentSettingsTable()
  const { upi_id, qr_image_url, business_name, razorpay_key_id, razorpay_key_secret } = await req.json()

  // Deactivate old settings
  await sql`UPDATE payment_settings SET is_active = false`
  const rows = await sql`
    INSERT INTO payment_settings (upi_id, qr_image_url, business_name, razorpay_key_id, razorpay_key_secret, is_active)
    VALUES (
      ${upi_id ? String(upi_id).trim() : null},
      ${qr_image_url ? String(qr_image_url).trim() : null},
      ${business_name ? String(business_name).trim() : null},
      ${razorpay_key_id ? String(razorpay_key_id).trim() : null},
      ${razorpay_key_secret ? String(razorpay_key_secret).trim() : null},
      true
    )
    RETURNING *
  `
  return NextResponse.json({ settings: rows[0] })
}
