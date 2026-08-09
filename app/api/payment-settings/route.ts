import { NextResponse } from 'next/server'
import sql from '@/lib/db'

// Public endpoint — returns only what the checkout page needs
export async function GET() {
  try {
    const rows = await sql`SELECT upi_id, qr_image_url, business_name FROM payment_settings WHERE is_active = true ORDER BY id DESC LIMIT 1`
    return NextResponse.json(
      { settings: rows[0] ?? null },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } },
    )
  } catch (error) {
    console.error('[payment-settings GET] error:', error)
    return NextResponse.json({ settings: null })
  }
}
