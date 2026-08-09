'use client'

import Link from 'next/link'
import Image from 'next/image'
import useSWR from 'swr'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice, formatDate, getOrderStatusColor } from '@/lib/utils-shop'
import { useAuth } from '@/components/auth-provider'
import { Package } from 'lucide-react'
import type { Order } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function OrdersPage() {
  const { user } = useAuth()
  const { data, isLoading } = useSWR(user ? '/api/orders' : null, fetcher)
  const orders: Order[] = data?.orders ?? []

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-semibold mb-2">Sign in to view orders</h1>
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
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-8">My Orders</h1>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-1">No orders yet</h2>
              <p className="text-muted-foreground mb-5 text-sm">When you place an order, it will appear here.</p>
              <Button asChild><Link href="/products">Start Shopping</Link></Button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border bg-muted/30">
                    <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-6 text-sm">
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold">Order #</p>
                        <p className="font-semibold text-xs sm:text-sm">{order.id}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold">Date</p>
                        <p className="font-medium text-xs sm:text-sm">{formatDate(order.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold">Total</p>
                        <p className="font-semibold text-xs sm:text-sm">{formatPrice(order.total)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                      <Badge className={`text-xs capitalize ${getOrderStatusColor(order.status)}`}>
                        {order.status}
                      </Badge>
                      <Button variant="outline" size="sm" className="h-9 px-4 font-semibold text-xs" asChild>
                        <Link href={`/orders/${order.id}`}>Details</Link>
                      </Button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex gap-2 overflow-x-auto">
                      {(order.items ?? []).slice(0, 4).map((item, i) => (
                        <div key={i} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 flex-shrink-0">
                          {item.product_image && (
                            <div className="relative w-8 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
                              <Image src={item.product_image} alt={item.product_name} fill className="object-cover" sizes="32px" />
                            </div>
                          )}
                          <span className="text-xs font-medium max-w-[120px] truncate">{item.product_name}</span>
                          <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                        </div>
                      ))}
                      {(order.items?.length ?? 0) > 4 && (
                        <div className="flex items-center px-3 py-2 text-xs text-muted-foreground flex-shrink-0">
                          +{(order.items?.length ?? 0) - 4} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
