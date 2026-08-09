'use client'

import Link from 'next/link'
import Image from 'next/image'
import useSWR from 'swr'
import { Heart } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/lib/utils-shop'
import { useAuth } from '@/components/auth-provider'
import { useCart } from '@/components/cart-provider'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface WishlistItem {
  id: number
  product_id: number
  name: string
  price: number
  discount_price: number | null
  images: string[]
  stock: number
  rating: number
  rating_count: number
}

export default function WishlistPage() {
  const { user } = useAuth()
  const { refreshCart } = useCart()
  const { data, isLoading, mutate } = useSWR(user ? '/api/wishlist' : null, fetcher)
  const items: WishlistItem[] = data?.items ?? []

  const removeFromWishlist = async (productId: number) => {
    await fetch('/api/wishlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ product_id: productId }),
    })
    mutate()
    toast.success('Removed from wishlist')
  }

  const addToCart = async (item: WishlistItem) => {
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ product_id: item.product_id, quantity: 1 }),
    })
    if (res.ok) {
      refreshCart()
      toast.success('Added to cart')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h1 className="text-xl font-semibold mb-2">Sign in to view wishlist</h1>
            <Button asChild className="mt-3"><Link href="/login">Sign In</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-8">My Wishlist</h1>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="aspect-square rounded-xl" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20">
              <Heart className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Your wishlist is empty</h2>
              <p className="text-muted-foreground text-sm mb-5">Save items you love by clicking the heart icon</p>
              <Button asChild><Link href="/products">Browse Products</Link></Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {items.map(item => {
                const price = item.discount_price ?? item.price
                return (
                  <div key={item.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    <Link href={`/products/${item.product_id}`} className="block relative aspect-square bg-muted">
                      {item.images?.[0] ? (
                        <Image src={item.images[0]} alt={item.name} fill className="object-cover hover:scale-105 transition-transform duration-300" sizes="(max-width: 640px) 50vw, 25vw" />
                      ) : (
                        <div className="w-full h-full bg-muted" />
                      )}
                    </Link>
                    <div className="p-3">
                      <Link href={`/products/${item.product_id}`} className="text-sm font-medium hover:underline line-clamp-2">{item.name}</Link>
                      <p className="font-bold mt-1">{formatPrice(price)}</p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="flex-1 h-7 text-xs"
                          onClick={() => addToCart(item)}
                          disabled={item.stock === 0}
                        >
                          {item.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                        </Button>
                        <button
                          onClick={() => removeFromWishlist(item.product_id)}
                          className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors border border-border rounded-md"
                          aria-label="Remove from wishlist"
                        >
                          <Heart className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
