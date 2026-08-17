import { notFound } from 'next/navigation'
import { cache } from 'react'
import sql from '@/lib/db'
import Header from '@/components/header'
import Footer from '@/components/footer'
import ProductDetailClient from './product-detail-client'
import type { Product } from '@/lib/types'

export const revalidate = 3600 // 1 hour ISR

function formatProduct(p: any): Product {
  return {
    ...p,
    price: Number(p.price) || 0,
    discount_price: p.discount_price != null ? Number(p.discount_price) : null,
    rating: Number(p.rating) || 0,
    rating_count: Number(p.rating_count) || 0,
  }
}

// Wrap getProduct in React cache to deduplicate database fetches
const getProduct = cache(async (id: string): Promise<Product | null> => {
  try {
    const rows = await sql`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ${parseInt(id)}
    `
    return rows[0] ? formatProduct(rows[0]) : null
  } catch {
    return null
  }
})

const getRelated = cache(async (product: Product): Promise<Product[]> => {
  try {
    const rows = await sql`
      SELECT 
        p.id, p.name, p.price, p.discount_price, p.category_id, 
        p.images, p.stock, p.sizes, p.rating, p.rating_count, 
        p.is_featured, p.is_best_seller,
        c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = ${product.category_id} AND p.id != ${product.id}
      ORDER BY p.rating DESC
      LIMIT 4
    `
    return rows.map(formatProduct)
  } catch {
    return []
  }
})

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
    title: `${product.name} — ZYRØCORE`,
    description: product.description || `Buy ${product.name} at ZYRØCORE`,
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
