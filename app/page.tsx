import Header from '@/components/header'
import Footer from '@/components/footer'
import HeroSection from './home/hero-section'
import FeaturedProducts from './home/featured-products'
import NewArrivalsSection from './home/new-arrivals-section'
import BestSellers from './home/best-sellers'
import BannerStrip from './home/banner-strip'
import JourneySection from './home/journey-section'
import EmptyStorefront from './home/empty-storefront'
import sql from '@/lib/db'
import type { Product } from '@/lib/types'

export const revalidate = 3600 // 1 hour ISR

async function getHomepageData() {
  try {
    const [newArrivals, featured, bestSellers] = await Promise.all([
      sql`
        SELECT p.id, p.name, p.description, p.price, p.discount_price, p.category_id, p.images, p.stock, p.rating, p.rating_count, p.is_featured, p.is_best_seller, p.created_at, c.name as category_name, c.slug as category_slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.created_at DESC
        LIMIT 4
      ` as Promise<any[]>,
      sql`
        SELECT p.id, p.name, p.description, p.price, p.discount_price, p.category_id, p.images, p.stock, p.rating, p.rating_count, p.is_featured, p.is_best_seller, p.created_at, c.name as category_name, c.slug as category_slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_featured = true
        ORDER BY p.created_at DESC
        LIMIT 8
      ` as Promise<any[]>,
      sql`
        SELECT p.id, p.name, p.description, p.price, p.discount_price, p.category_id, p.images, p.stock, p.rating, p.rating_count, p.is_featured, p.is_best_seller, p.created_at, c.name as category_name, c.slug as category_slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_best_seller = true
        ORDER BY p.rating_count DESC
        LIMIT 8
      ` as Promise<any[]>
    ])
    
    const newArrivalsList = Array.isArray(newArrivals) ? newArrivals : []
    const featuredList = Array.isArray(featured) ? featured : []
    const bestSellersList = Array.isArray(bestSellers) ? bestSellers : []
    
    return {
      newArrivals: newArrivalsList as unknown as Product[],
      featured: featuredList as unknown as Product[],
      bestSellers: bestSellersList as unknown as Product[],
      hasProducts: newArrivalsList.length > 0
    }
  } catch (err) {
    console.error('[homepage data fetch error]:', err)
    return { newArrivals: [], featured: [], bestSellers: [], hasProducts: false }
  }
}

export default async function HomePage() {
  const { newArrivals, featured, bestSellers, hasProducts } = await getHomepageData()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        {hasProducts ? (
          <>
            <NewArrivalsSection products={newArrivals} />
            <FeaturedProducts products={featured} />
            <BannerStrip />
            <JourneySection />
            <BestSellers products={bestSellers} />
          </>
        ) : (
          <>
            <BannerStrip />
            <JourneySection />
            <EmptyStorefront />
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
