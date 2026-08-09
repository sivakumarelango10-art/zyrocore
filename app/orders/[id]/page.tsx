'use client'

import Link from 'next/link'
import Image from 'next/image'
import { use } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { CheckCircle, Package, Star } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice, formatDate, getOrderStatusColor } from '@/lib/utils-shop'

import { Suspense } from 'react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function OrderDetailContent({ id }: { id: string }) {
  const searchParams = useSearchParams()
  const isSuccess = searchParams.get('success') === '1'

  const { data, isLoading } = useSWR(`/api/orders/${id}`, fetcher)
  const order = data?.order

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 w-full">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h1 className="text-lg font-semibold">Order not found</h1>
          <Button asChild className="mt-4"><Link href="/orders">My Orders</Link></Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-8 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Order placed successfully!</p>
            <p className="text-sm text-green-700">Thank you for your order. We{"'"}ll email you when it ships.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Order #{order.id}</h1>
        <Badge className={`capitalize ${getOrderStatusColor(order.status)}`}>{order.status}</Badge>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-0.5">Date Placed</p>
          <p className="font-medium text-sm">{formatDate(order.created_at)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-0.5">Total</p>
          <p className="font-bold">{formatPrice(order.total)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-0.5">Status</p>
          <p className="font-medium text-sm capitalize">{order.status}</p>
          {order.tracking_number && (
            <p className="text-xs text-muted-foreground mt-0.5">Tracking: {order.tracking_number}</p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Items Ordered</h2>
          <span className="text-xs text-muted-foreground">Rate your purchased items below</span>
        </div>
        <div className="divide-y divide-border">
          {order.items?.map((item: { id: number; product_id?: number; product_image: string; product_name: string; size: string; quantity: number; price: number }) => (
            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
              <div className="flex gap-3 items-center min-w-0">
                {item.product_image && (
                  <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                    <Image src={item.product_image} alt={item.product_name} fill className="object-cover" sizes="56px" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{item.product_name}</p>
                  {item.size && <p className="text-xs text-muted-foreground">Size: {item.size}</p>}
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                <p className="font-semibold text-sm">{formatPrice(item.price * item.quantity)}</p>
                {item.product_id && (
                  <Button asChild size="sm" variant="outline" className="text-xs font-semibold flex items-center gap-1">
                    <Link href={`/products/${item.product_id}#reviews`}>
                      <Star className="w-3.5 h-3.5 fill-foreground text-foreground" /> Rate Item
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <h2 className="font-semibold mb-4">Order Summary</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>{order.shipping_cost === 0 ? 'Free' : formatPrice(order.shipping_cost)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Shipping */}
      {order.shipping_name && (
        <div className="bg-card border border-border rounded-xl p-5 mb-8">
          <h2 className="font-semibold mb-3">Shipping Address</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {order.shipping_name}<br />
            {order.shipping_address}<br />
            {order.shipping_city}, {order.shipping_state} {order.shipping_zip}
          </p>
          {order.shipping_phone && (
            <p className="text-sm text-muted-foreground mt-1">{order.shipping_phone}</p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/orders">Back to Orders</Link>
        </Button>
        <Button asChild>
          <Link href="/products">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  )
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Suspense fallback={
          <div className="max-w-3xl mx-auto px-4 py-8 w-full">
            <Skeleton className="h-8 w-48 mb-6" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        }>
          <OrderDetailContent id={id} />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
