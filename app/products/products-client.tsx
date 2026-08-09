'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { SlidersHorizontal, Search } from 'lucide-react'
import ProductCard from '@/components/product-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ProductsClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const category = searchParams.get('category') || ''
  const search = searchParams.get('search') || ''
  const sort = searchParams.get('sort') || ''
  const featured = searchParams.get('featured') || ''
  const bestSeller = searchParams.get('best_seller') || ''
  const page = parseInt(searchParams.get('page') || '1')

  const [localSearch, setLocalSearch] = useState(search)

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (search) params.set('search', search)
    if (sort) params.set('sort', sort)
    if (featured) params.set('featured', featured)
    if (bestSeller) params.set('best_seller', bestSeller)
    params.set('page', String(page))
    params.set('limit', '12')
    return `/api/products?${params.toString()}`
  }, [category, search, sort, featured, bestSeller, page])

  const { data, isLoading } = useSWR(buildUrl(), fetcher)

  const products: Product[] = data?.products ?? []
  const totalPages = data?.totalPages ?? 1

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`/products?${params.toString()}`)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateParam('search', localSearch.trim())
  }

  const getTitle = () => {
    if (search) return `"${search}"`
    if (bestSeller === 'true') return 'Best Sellers'
    if (featured === 'true') return 'Featured'
    if (category) return category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' & ')
    return 'All Products'
  }

  return (
    /* pb-24 ensures content clears the sticky bottom navigation on mobile */
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-16 pb-24 md:pb-16">
      {/* Header — stack vertically on mobile */}
      <div className="flex flex-col gap-4 mb-6 md:mb-12">
        <div>
          <h1
            className="font-bold text-foreground text-balance leading-tight"
            style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)' }}
          >
            {getTitle()}
          </h1>
          {data && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{data.total} items</p>
          )}
        </div>

        {/* Search + Sort — full width on mobile, inline on sm+ */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <form onSubmit={handleSearch} className="flex gap-1.5 flex-1">
            <Input
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="Search products..."
              className="flex-1 h-10 text-base sm:text-sm"
              /* inputMode="search" prevents zoom AND shows search keyboard on iOS */
              inputMode="search"
            />
            <Button type="submit" size="sm" variant="outline" className="h-10 px-3 flex-shrink-0">
              <Search className="w-4 h-4" />
            </Button>
          </form>

          <Select value={sort} onValueChange={v => updateParam('sort', v)}>
            <SelectTrigger className="h-10 text-sm w-full sm:w-48 border-border/80">
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              <SelectValue placeholder="Filter and Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Top Rated</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price_asc">Price: Low → High</SelectItem>
              <SelectItem value="price_desc">Price: High → Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Category pills — horizontal scroll with momentum */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2 scroll-x-contain">
        {[
          { label: 'All', slug: '' },
          { label: 'Formals', slug: 'formals' },
          { label: 'Casuals', slug: 'casuals' },
          { label: 'Party Wear', slug: 'party-wear' },
          { label: 'Premium', slug: 'premium-collection' },
          { label: 'New Arrivals', slug: 'new-arrivals' },
          { label: 'Sale', slug: 'sale' },
        ].map(cat => (
          <button
            key={cat.slug}
            onClick={() => updateParam('category', cat.slug)}
            suppressHydrationWarning
            className={`flex-shrink-0 px-3 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors border min-h-[36px] ${
              category === cat.slug
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-border hover:border-foreground/30'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product Grid — 2 col mobile, 3 col sm, 4 col md+ */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <Skeleton className="aspect-[4/5]" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-2.5 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-7 w-full mt-1" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-base font-medium text-foreground">No products found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
          <Button className="mt-4" onClick={() => router.push('/products')}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8 md:mt-10">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4"
            disabled={page <= 1}
            onClick={() => updateParam('page', String(page - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4"
            disabled={page >= totalPages}
            onClick={() => updateParam('page', String(page + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
