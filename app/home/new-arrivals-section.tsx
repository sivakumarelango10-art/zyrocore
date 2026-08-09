import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import ProductCard from '@/components/product-card'
import type { Product } from '@/lib/types'

export default function NewArrivalsSection({ products }: { products: Product[] }) {
  if (!products || products.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 py-10 md:py-20 border-t border-border">
      {/* Section Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-10 md:mb-14 animate-reveal-up"
        style={{ animationDelay: '100ms', animationPlayState: 'running' }}
      >
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent mb-2">
            <Sparkles className="w-3.5 h-3.5" /> New Arrivals
          </div>
          <h2 className="font-bold text-foreground tracking-tight" style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)' }}>
            Latest Drops
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Discover our newest collections. Built for ambitious.
          </p>
        </div>

        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-foreground hover:opacity-80 transition-opacity group flex-shrink-0"
        >
          Explore All <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Grid — 2 columns on mobile (matches shop page), 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
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
