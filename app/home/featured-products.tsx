import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import ProductCard from '@/components/product-card'
import type { Product } from '@/lib/types'

export default function FeaturedProducts({ products }: { products: Product[] }) {
  if (!products || products.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8 animate-reveal-up" style={{ animationDelay: '100ms', animationPlayState: 'running' }}>
        <div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground text-balance">Featured Styles</h2>
          <p className="text-sm text-muted-foreground mt-2">Hand-picked looks from ZYRØCORE</p>
        </div>
        <Link href="/products?featured=true" className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:opacity-70 transition-opacity">
          View All <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {products.map((product, idx) => (
          <div 
            key={product.id}
            className="animate-reveal-up"
            style={{ animationDelay: `${150 + idx * 80}ms`, animationPlayState: 'running' }}
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}
