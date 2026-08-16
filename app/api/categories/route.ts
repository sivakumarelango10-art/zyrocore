import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET() {
  try {
    const categories = await sql`SELECT * FROM categories ORDER BY name ASC`
    return NextResponse.json(
      { categories },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    )
  } catch (error) {
    console.error('Categories GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
