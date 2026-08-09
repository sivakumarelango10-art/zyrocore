import { type NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { quantity } = await req.json()

    if (quantity < 1) {
      await sql`DELETE FROM cart_items WHERE id = ${parseInt(id)} AND user_id = ${user.id}`
    } else {
      await sql`
        UPDATE cart_items SET quantity = ${quantity}
        WHERE id = ${parseInt(id)} AND user_id = ${user.id}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cart PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
