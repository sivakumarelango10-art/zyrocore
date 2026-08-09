import { notFound } from 'next/navigation'
import { cache } from 'react'
import sql from '@/lib/db'
import Header from '@/components/header'
import Footer from '@/components/footer'
import ProductDetailClient from './product-detail-client'
import type { Product } from '@/lib/types'

export const revalidate = 3600 // 1 hour ISR

// Wrap getProduct in React cache to deduplicate database fetches
const getProduct = cache(async (id: string): Promise<Product | null> => {
  try {
    const rows = await sql`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ${parseInt(id)}
    `
    return rows[0] as Product || null
  } catch {
    return null
  }
})

async function getRelated(product: Product): Promise<Product[]> {
  try {
    const rows = await sql`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = ${product.category_id} AND p.id != ${product.id}
      ORDER BY p.rating DESC
      LIMIT 4
    `
    return rows as unknown as Product[]
  } catch {
    return []
  }
}

export async function generateStaticParams() {
  try {
    const rows = await sql`SELECT id FROM products LIMIT 100`
    return rows.map(row => ({ id: String(row.id) }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return { title: 'Product Not Found' }
  return {
    title: `${product.name} — ShopMart`,
    description: product.description || `Buy ${product.name} at ShopMart`,
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) notFound()

  const related = await getRelated(product)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <ProductDetailClient product={product} related={related} />
      </main>
      <Footer />
    </div>
  )
}
