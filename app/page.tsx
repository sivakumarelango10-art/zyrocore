import Header from '@/components/header'
import Footer from '@/components/footer'
import HeroSection from './home/hero-section'
import BannerStrip from './home/banner-strip'
import NewArrivalsSection from './home/new-arrivals-section'
import sql from '@/lib/db'
import type { Product } from '@/lib/types'

export const revalidate = 3600 // 1 hour ISR for fast edge response time (<500ms)

async function getHomeProducts(): Promise<Product[]> {
  try {
    const rawProducts = await sql`
      SELECT 
        p.id, p.name, p.description, p.price, p.discount_price, 
        p.category_id, p.images, p.stock, p.rating, p.rating_count, 
        p.is_featured, p.is_best_seller, p.show_on_home, p.created_at, 
        c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.show_on_home = true
      ORDER BY p.created_at DESC
      LIMIT 12
    ` as any[]

    if (!Array.isArray(rawProducts)) return []

    return rawProducts.map(p => ({
      ...p,
      price: Number(p.price) || 0,
      discount_price: p.discount_price ? Number(p.discount_price) : undefined,
      rating: Number(p.rating) || 0,
      rating_count: Number(p.rating_count) || 0,
      images: Array.isArray(p.images)
        ? p.images
        : typeof p.images === 'string'
        ? JSON.parse(p.images)
        : [],
    })) as Product[]
  } catch (err) {
    console.error('[HomePage] getHomeProducts error:', err)
    return []
  }
}

export default async function HomePage() {
  const homeProducts = await getHomeProducts()

  const productSchemas = homeProducts.map(product => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} — Premium activewear by ZYRØCORE.`,
    image: product.images?.[0] || 'https://www.zyrocore.in/logo-emblem.png',
    offers: {
      '@type': 'Offer',
      price: product.discount_price || product.price,
      priceCurrency: 'INR',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `https://www.zyrocore.in/products/${product.id}`,
    },
  }))

  return (
    <div className="min-h-screen flex flex-col">
      {productSchemas.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchemas) }}
        />
      )}
      <Header />
      <main id="main-content" className="flex-1">
        <HeroSection />
        <BannerStrip />
        <NewArrivalsSection products={homeProducts} />
      </main>
      <Footer />
    </div>
  )
}
