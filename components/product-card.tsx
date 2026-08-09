'use client'

import { memo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, Star, ShoppingCart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPrice, calculateDiscount } from '@/lib/utils-shop'
import type { Product } from '@/lib/types'
import { useAuth } from './auth-provider'
import { useCart } from './cart-provider'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface ProductCardProps {
  product: Product
  wishlistIds?: Set<number>
  onWishlistToggle?: (productId: number) => void
}

function ProductCard({ product, wishlistIds, onWishlistToggle }: ProductCardProps) {
  const { user } = useAuth()
  const { refreshCart } = useCart()
  const router = useRouter()
  const [addingToCart, setAddingToCart] = useState(false)
  const [togglingWishlist, setTogglingWishlist] = useState(false)

  const isWishlisted = wishlistIds?.has(product.id) ?? false
  const effectivePrice = product.discount_price ?? product.price
  const discount = product.discount_price
    ? calculateDiscount(product.price, product.discount_price)
    : 0

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!user) {
      router.push('/login')
      return
    }
    if (product.sizes && product.sizes.length > 0) {
      router.push(`/products/${product.id}`)
      return
    }
    setAddingToCart(true)
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, quantity: 1 }),
      })
      if (res.ok) {
        refreshCart()
        toast.success('Added to cart')
      } else {
        toast.error('Could not add to cart')
      }
    } finally {
      setAddingToCart(false)
    }
  }

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!user) {
      router.push('/login')
      return
    }
    setTogglingWishlist(true)
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.action === 'added' ? 'Added to wishlist' : 'Removed from wishlist')
        onWishlistToggle?.(product.id)
      }
    } finally {
      setTogglingWishlist(false)
    }
  }

  return (
    <Link href={`/products/${product.id}`} className="group block h-full">
      <div className="bg-card border border-border rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300 h-full flex flex-col hover-lift group-hover:border-foreground/30">

        {/* ── Image Container ── */}
        {/* aspect-[4/5] ensures equal card heights across the grid */}
        <div className="relative aspect-[4/5] bg-muted/30 overflow-hidden flex-shrink-0">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-300 ease-out md:group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              No image
            </div>
          )}

          {/* Desktop hover overlay gradient */}
          <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Quick Add — slides up on hover */}
          <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-2.5 z-20
                          translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100
                          transition-all duration-300 ease-out">
            <Button
              size="sm"
              className="w-full bg-foreground text-background hover:bg-foreground/90 font-bold shadow-xl
                         active:scale-[0.97] transition-all duration-150
                         h-8 sm:h-9 text-[11px] sm:text-xs"
              onClick={handleAddToCart}
              disabled={addingToCart || product.stock === 0}
            >
              <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
              {product.stock === 0 ? 'Out of Stock' : addingToCart ? 'Adding…' : 'Quick Add'}
            </Button>
          </div>

          {/* ── Badges: top-left ── */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {discount > 0 && (
              <Badge className="bg-foreground text-background font-bold text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded shadow-sm leading-tight">
                {discount}% OFF
              </Badge>
            )}
            {product.is_best_seller && (
              <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-background/85 text-foreground border border-border leading-tight">
                Best Seller
              </Badge>
            )}
          </div>

          {/* ── Wishlist: top-right (44×44px touch target minimum) ── */}
          <button
            onClick={handleWishlist}
            disabled={togglingWishlist}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`absolute top-2 right-2 w-9 h-9 sm:w-10 sm:h-10 rounded-full
                        flex items-center justify-center transition-all duration-300 shadow-md z-10
                        active:scale-90 touch-manipulation
                        ${isWishlisted
                          ? 'bg-foreground text-background scale-105'
                          : 'bg-background/85 text-muted-foreground hover:bg-foreground hover:text-background hover:scale-105'
                        }`}
          >
            <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all duration-200 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>

          {/* Out of stock overlay */}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
              <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase text-foreground bg-background px-3 py-1.5 rounded-full border border-border shadow-md">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* ── Product Info ── */}
        <div className="p-2.5 sm:p-3.5 flex flex-col flex-1">
          <div className="flex items-center justify-between gap-1 mb-1">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold truncate">
              {product.category_name || 'Collection'}
            </p>
            <div className="flex items-center gap-1 text-xs font-bold text-foreground shrink-0">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>
                {product.rating && Number(product.rating) > 0
                  ? Number(Number(product.rating).toFixed(1))
                  : 5}
              </span>
            </div>
          </div>
          <h3 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 leading-snug mb-2 group-hover:text-foreground/90 transition-colors">
            {product.name}
          </h3>

          {/* Price — pushed to bottom */}
          <div className="flex items-center gap-1.5 mt-auto">
            <span className="text-xs sm:text-sm font-bold text-foreground">{formatPrice(effectivePrice)}</span>
            {product.discount_price && (
              <span className="text-[10px] sm:text-xs text-muted-foreground line-through">{formatPrice(product.price)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default memo(ProductCard)
