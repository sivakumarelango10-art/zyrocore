import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import sql from '@/lib/db'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const rows = await sql`SELECT * FROM payment_settings WHERE is_active = true ORDER BY id DESC LIMIT 1`
  return NextResponse.json({ settings: rows[0] ?? null })
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { upi_id, qr_image_url, business_name } = await req.json()
  if (!upi_id || !qr_image_url) {
    return NextResponse.json({ error: 'upi_id and qr_image_url are required' }, { status: 400 })
  }
  // Deactivate old settings
  await sql`UPDATE payment_settings SET is_active = false`
  const rows = await sql`
    INSERT INTO payment_settings (upi_id, qr_image_url, business_name, is_active)
    VALUES (${upi_id}, ${qr_image_url}, ${business_name ?? null}, true)
    RETURNING *
  `
  return NextResponse.json({ settings: rows[0] })
}
