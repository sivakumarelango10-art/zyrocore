import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import sql from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { payment_status } = await req.json()

  if (!['confirmed', 'rejected'].includes(payment_status)) {
    return NextResponse.json({ error: 'Invalid payment_status' }, { status: 400 })
  }

  const rows = await sql`
    UPDATE orders
    SET payment_status = ${payment_status},
        status = ${payment_status === 'confirmed' ? 'confirmed' : 'pending'}
    WHERE id = ${parseInt(id)}
    RETURNING id, payment_status, status
  `
  if (rows.length === 0) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  return NextResponse.json({ order: rows[0] })
}
