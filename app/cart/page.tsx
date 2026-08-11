'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { formatPrice } from '@/lib/utils-shop'
import { useAuth } from '@/components/auth-provider'
import { useCart } from '@/components/cart-provider'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface CartItem {
  id: number
  product_id: number
  quantity: number
  size: string | null
  name: string
  price: number
  discount_price: number | null
  images: string[]
  stock: number
  size_stock?: Record<string, number>
}

export default function CartPage() {
  const { user } = useAuth()
  const { refreshCart } = useCart()
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR(user ? '/api/cart' : null, fetcher)
  const items: CartItem[] = data?.items ?? []

  const updateQty = async (id: number, quantity: number) => {
    const res = await fetch(`/api/cart/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ quantity }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(json.error || 'Could not update quantity')
    }
    mutate()
    refreshCart()
  }

  const removeItem = async (id: number) => {
    await fetch(`/api/cart?id=${id}`, {
      method: 'DELETE',
    })
    mutate()
    refreshCart()
    toast.success('Item removed')
  }

  const subtotal = items.reduce((sum, item) => {
    const price = item.discount_price ?? item.price
    return sum + price * item.quantity
  }, 0)
  const shipping = subtotal >= 999 ? 0 : 99
  const total = subtotal + shipping

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center py-20">
            <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Sign in to view your cart</h1>
            <Button asChild className="mt-3">
              <Link href="/login">Sign In</Link>
            </Button>
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
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 pb-24 lg:pb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-5 sm:mb-8">Shopping Cart</h1>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">Add some items to get started</p>
              <Button asChild>
                <Link href="/products">Continue Shopping</Link>
              </Button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map(item => {
                  const price = item.discount_price ?? item.price
                  return (
                    <div key={item.id} className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-card border border-border rounded-xl">
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                        {item.images?.[0] && (
                          <Image src={item.images[0]} alt={item.name} fill className="object-cover" sizes="80px" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/products/${item.product_id}`} className="font-medium text-foreground hover:underline text-xs sm:text-sm line-clamp-2 leading-tight">
                          {item.name}
                        </Link>
                        {item.size && (
                          <p className="text-xs text-muted-foreground mt-0.5">Size: {item.size}</p>
                        )}
                        <p className="font-semibold mt-1">{formatPrice(price)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1.5 border border-border rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateQty(item.id, item.quantity - 1)}
                            className="w-10 h-10 flex items-center justify-center hover:bg-muted active:scale-95 transition-all text-foreground"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                          <button
                            onClick={() => updateQty(item.id, item.quantity + 1)}
                            className="w-10 h-10 flex items-center justify-center hover:bg-muted active:scale-95 transition-all text-foreground"
                            aria-label="Increase quantity"
                            disabled={
                              item.quantity >= (item.size && item.size_stock?.[item.size] !== undefined
                                ? Math.max(0, Number(item.size_stock[item.size]) || 0)
                                : Math.max(0, Number(item.stock) || 0))
                            }
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm font-bold">{formatPrice(price * item.quantity)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Summary (Desktop Box & Sticky Placement) */}
              <div className="lg:col-span-1">
                <div className="bg-card border border-border rounded-xl p-5 sticky top-24">
                  <h2 className="font-bold text-lg mb-4">Order Summary</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
                    </div>
                    {shipping > 0 && (
                      <p className="text-xs text-muted-foreground">Add {formatPrice(999 - subtotal)} more for free shipping</p>
                    )}
                  </div>
                  <Separator className="my-4" />
                  <div className="flex justify-between font-bold text-lg mb-5">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <Button className="w-full h-11 text-base font-bold" size="lg" onClick={() => router.push('/checkout')}>
                    Proceed to Checkout
                  </Button>
                  <Button variant="outline" className="w-full mt-2 h-10 text-xs font-semibold" asChild>
                    <Link href="/products">Continue Shopping</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Sticky Checkout Bar (Always accessible on screens < 1024px) */}
        {items.length > 0 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-4 shadow-2xl backdrop-blur-md">
            <div>
              <p className="text-xs text-muted-foreground">Total ({items.length} items)</p>
              <p className="text-lg font-black text-foreground leading-tight">{formatPrice(total)}</p>
            </div>
            <Button size="lg" className="h-11 px-6 font-bold text-sm bg-foreground text-background" onClick={() => router.push('/checkout')}>
              Proceed to Checkout
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
