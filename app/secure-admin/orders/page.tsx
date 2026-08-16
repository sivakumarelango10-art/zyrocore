'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import AdminShell from '../admin-shell'
import { ShoppingBag, Search, X, ChevronDown, Truck, CreditCard, User, MapPin, Package, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { formatPrice } from '@/lib/utils-shop'

function fmtDate(s: string) {
  if (!s) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(s))
}

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
const STATUSES: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending:   'text-amber-700 bg-amber-50 border-amber-200',
  confirmed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  shipped:   'text-blue-700 bg-blue-50 border-blue-200',
  delivered: 'text-purple-700 bg-purple-50 border-purple-200',
  cancelled: 'text-red-700 bg-red-50 border-red-200',
}

const COMMON_COURIERS = ['BlueDart', 'Delhivery', 'DTDC', 'India Post', 'Speed Post', 'Ecom Express', 'Shadowfax', 'FedEx']

interface OrderItem {
  id: number
  product_name: string
  product_image?: string | null
  product_images?: string[] | string | null
  size?: string | null
  quantity: number
  price: number
}

interface Order {
  id: number
  status: OrderStatus
  subtotal: number
  shipping_cost: number
  total: number
  payment_method?: string | null
  payment_status?: string | null
  razorpay_order_id?: string | null
  razorpay_payment_id?: string | null
  created_at: string
  user_name?: string | null
  user_email?: string | null
  shipping_name?: string | null
  shipping_phone?: string | null
  shipping_address?: string | null
  shipping_address2?: string | null
  shipping_landmark?: string | null
  shipping_city?: string | null
  shipping_district?: string | null
  shipping_state?: string | null
  shipping_pincode?: string | null
  shipping_country?: string | null
  courier_name?: string | null
  tracking_number?: string | null
  tracking_url?: string | null
  notes?: string | null
  items?: OrderItem[]
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  // Detailed view state
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [fullOrder, setFullOrder] = useState<Order | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const [updatingId, setUpdatingId] = useState<number | null>(null)

  // Tracking inputs
  const [courierInput, setCourierInput] = useState('')
  const [trackingInput, setTrackingInput] = useState('')
  const [trackingUrlInput, setTrackingUrlInput] = useState('')

  const statusFilterRef = useRef(statusFilter)

  const load = (status = statusFilterRef.current, silent = false) => {
    if (!silent) setLoading(true)
    const url = status ? `/api/admin/orders?status=${status}&limit=50` : '/api/admin/orders?limit=50'
    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setOrders(data?.orders ?? [])
      })
      .finally(() => {
        if (!silent) setLoading(false)
      })
  }

  // Fetch full details of an order including items
  const loadOrderDetails = (orderId: number) => {
    setSelectedOrderId(orderId)
    setLoadingDetails(true)
    fetch(`/api/admin/orders/${orderId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.order) {
          setFullOrder(data.order)
          setCourierInput(data.order.courier_name || '')
          setTrackingInput(data.order.tracking_number || '')
          setTrackingUrlInput(data.order.tracking_url || '')
        }
      })
      .finally(() => setLoadingDetails(false))
  }

  useEffect(() => {
    load()

    const handleRealtimeUpdate = () => {
      load(statusFilterRef.current, true)
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) load(statusFilterRef.current, true)
    }

    window.addEventListener('zyrocore-realtime-update', handleRealtimeUpdate)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const interval = setInterval(() => {
      if (!document.hidden) load(statusFilterRef.current, true)
    }, 5000)

    return () => {
      clearInterval(interval)
      window.removeEventListener('zyrocore-realtime-update', handleRealtimeUpdate)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const filtered = orders.filter(o => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      String(o.id).includes(q) ||
      (o.user_name || '').toLowerCase().includes(q) ||
      (o.user_email || '').toLowerCase().includes(q) ||
      (o.shipping_name || '').toLowerCase().includes(q) ||
      (o.shipping_phone || '').includes(q)
    )
  })

  const handleFilterChange = (s: string) => {
    setStatusFilter(s)
    statusFilterRef.current = s
    load(s)
  }

  const handleStatusUpdate = async (orderId: number, newStatus: OrderStatus) => {
    setUpdatingId(orderId)
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      toast.success(`Order #${orderId} status updated to ${newStatus}`)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
      if (fullOrder?.id === orderId) {
        setFullOrder(prev => prev ? { ...prev, status: newStatus } : null)
      }
    } else toast.error('Failed to update order status')
    setUpdatingId(null)
  }

  const handleSaveTracking = async () => {
    if (!fullOrder) return
    setUpdatingId(fullOrder.id)

    // Auto-transform order status to 'shipped' if tracking details are entered and order is not delivered/cancelled
    const autoShip = fullOrder.status !== 'delivered' && fullOrder.status !== 'cancelled'
    const targetStatus: OrderStatus = autoShip ? 'shipped' : fullOrder.status

    const res = await fetch(`/api/admin/orders/${fullOrder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courier_name: courierInput.trim() || null,
        tracking_number: trackingInput.trim() || null,
        tracking_url: trackingUrlInput.trim() || null,
        status: targetStatus,
      }),
    })

    const resData = await res.json().catch(() => ({}))

    if (res.ok) {
      const finalStatus = (resData.order?.status as OrderStatus) || targetStatus
      toast.success(
        finalStatus === 'shipped'
          ? `Tracking details saved & Order #${fullOrder.id} status updated to SHIPPED!`
          : `Tracking details saved for Order #${fullOrder.id}`
      )
      const updatedUrl = resData.order?.tracking_url ?? (trackingUrlInput.trim() || null)
      setOrders(prev => prev.map(o => o.id === fullOrder.id ? {
        ...o,
        courier_name: courierInput.trim() || null,
        tracking_number: trackingInput.trim() || null,
        tracking_url: updatedUrl,
        status: finalStatus,
      } : o))
      setFullOrder(prev => prev ? {
        ...prev,
        courier_name: courierInput.trim() || null,
        tracking_number: trackingInput.trim() || null,
        tracking_url: updatedUrl,
        status: finalStatus,
      } : null)
    } else {
      toast.error(resData.error || 'Failed to save tracking details')
    }
    setUpdatingId(null)
  }

  return (
    <AdminShell>
      <div className="p-6 space-y-6 max-w-7xl pb-12">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-neutral-900 text-2xl font-bold tracking-tight">Orders Management</h1>
            <p className="text-neutral-500 text-sm mt-0.5">{orders.length} total orders recorded</p>
          </div>
          <button
            onClick={() => load(statusFilterRef.current)}
            className="px-3 py-2 border border-neutral-200 rounded-xl bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold flex items-center gap-2 transition-colors shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-neutral-500" /> Refresh Orders
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Order ID, name, email, phone..."
              suppressHydrationWarning
              className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-neutral-900 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors shadow-2xs"
            />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => handleFilterChange('')}
              suppressHydrationWarning
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${!statusFilter ? 'bg-black text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:text-black hover:border-neutral-300'}`}
            >
              All
            </button>
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => handleFilterChange(s)}
                suppressHydrationWarning
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${statusFilter === s ? 'bg-black text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:text-black hover:border-neutral-300'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table & Modal Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Orders Table */}
          <div className={`${selectedOrderId ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm transition-all duration-300`}>
            {loading ? (
              <div className="py-20 text-center text-neutral-400 text-sm font-medium">Loading orders...</div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <ShoppingBag className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                <p className="text-neutral-500 text-sm font-medium">No orders found matching criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50/50">
                      {['Order ID', 'Customer', 'Payment Status', 'Order Status', 'Total', 'Date'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(order => {
                      const isSelected = selectedOrderId === order.id
                      const isPaid = order.payment_status === 'paid'
                      return (
                        <tr
                          key={order.id}
                          onClick={() => loadOrderDetails(order.id)}
                          className={`border-b border-neutral-100 cursor-pointer transition-colors ${
                            isSelected ? 'bg-neutral-100/70 font-medium' : 'hover:bg-neutral-50/60'
                          }`}
                        >
                          <td className="px-4 py-3 text-neutral-900 font-mono text-xs font-bold">#{order.id}</td>
                          <td className="px-4 py-3">
                            <p className="text-neutral-900 font-semibold text-xs">{order.shipping_name || order.user_name || 'Guest'}</p>
                            <p className="text-neutral-400 text-[11px] truncate max-w-[140px]">{order.user_email || order.shipping_phone || ''}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                              isPaid ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'
                            }`}>
                              {order.payment_status || 'pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border capitalize ${STATUS_STYLE[order.status] ?? 'text-neutral-600 bg-neutral-50 border-neutral-200'}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-neutral-950 font-bold text-xs">{formatPrice(order.total)}</td>
                          <td className="px-4 py-3 text-neutral-500 text-xs">{fmtDate(order.created_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Full Detailed Order Inspector Panel */}
          {selectedOrderId && (
            <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-2xl p-5 shadow-lg space-y-5 sticky top-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-black" />
                  <h3 className="text-neutral-900 text-base font-bold">Order Details #{selectedOrderId}</h3>
                </div>
                <button
                  onClick={() => { setSelectedOrderId(null); setFullOrder(null) }}
                  className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingDetails || !fullOrder ? (
                <div className="py-12 text-center text-neutral-400 text-sm font-medium">Loading full order record...</div>
              ) : (
                <div className="space-y-5">
                  {/* Status Dropdown */}
                  <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/80 flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Change Status</span>
                    <div className="relative">
                      <select
                        value={fullOrder.status}
                        onChange={e => handleStatusUpdate(fullOrder.id, e.target.value as OrderStatus)}
                        disabled={updatingId === fullOrder.id}
                        className="appearance-none bg-white border border-neutral-200 rounded-lg pl-3 pr-7 py-1 text-neutral-900 text-xs font-bold focus:outline-none focus:border-black cursor-pointer shadow-2xs"
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s} className="capitalize">
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-neutral-400" /> Customer Contact Information
                    </h4>
                    <div className="bg-neutral-50/80 rounded-xl p-3.5 border border-neutral-200/80 text-xs space-y-1">
                      <p className="font-bold text-neutral-900 text-sm">{fullOrder.shipping_name || fullOrder.user_name || 'Guest User'}</p>
                      {fullOrder.user_email && <p className="text-neutral-600"><span className="font-medium text-neutral-400">Email:</span> {fullOrder.user_email}</p>}
                      {fullOrder.shipping_phone && <p className="text-neutral-600"><span className="font-medium text-neutral-400">Phone:</span> {fullOrder.shipping_phone}</p>}
                    </div>
                  </div>

                  {/* Complete Delivery Address */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" /> Complete Delivery Address
                    </h4>
                    <div className="bg-neutral-50/80 rounded-xl p-3.5 border border-neutral-200/80 text-xs space-y-1 text-neutral-700">
                      <p className="font-bold text-neutral-900">{fullOrder.shipping_address || 'No primary address line'}</p>
                      {fullOrder.shipping_address2 && <p>{fullOrder.shipping_address2}</p>}
                      {fullOrder.shipping_landmark && <p><span className="font-semibold text-neutral-400">Landmark:</span> {fullOrder.shipping_landmark}</p>}
                      <p>
                        {[
                          fullOrder.shipping_city,
                          fullOrder.shipping_district,
                          fullOrder.shipping_state,
                          fullOrder.shipping_pincode,
                          fullOrder.shipping_country || 'India',
                        ].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>

                  {/* Payment & Reference Details */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-neutral-400" /> Payment & Order References
                    </h4>
                    <div className="bg-neutral-50/80 rounded-xl p-3.5 border border-neutral-200/80 text-xs space-y-1 text-neutral-700 font-mono">
                      <p><span className="text-neutral-400 font-sans">Method:</span> <strong className="text-neutral-900 font-sans">{fullOrder.payment_method || 'Razorpay'}</strong></p>
                      <p><span className="text-neutral-400 font-sans">Payment Status:</span> <strong className="text-emerald-700 font-sans uppercase">{fullOrder.payment_status || 'pending'}</strong></p>
                      {fullOrder.razorpay_order_id && <p className="truncate"><span className="text-neutral-400 font-sans">Razorpay Order:</span> {fullOrder.razorpay_order_id}</p>}
                      {fullOrder.razorpay_payment_id && <p className="truncate"><span className="text-neutral-400 font-sans">Razorpay Payment:</span> {fullOrder.razorpay_payment_id}</p>}
                    </div>
                  </div>

                  {/* Courier & Tracking Number Input */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-neutral-400" /> Shipment & Tracking Information
                    </h4>
                    <div className="bg-neutral-50/80 rounded-xl p-3.5 border border-neutral-200/80 space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-neutral-500">Courier Service</label>
                        <input
                          list="courier-suggestions"
                          value={courierInput}
                          onChange={e => setCourierInput(e.target.value)}
                          placeholder="e.g. BlueDart, Delhivery, Speed Post"
                          className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-black transition-colors"
                        />
                        <datalist id="courier-suggestions">
                          {COMMON_COURIERS.map(c => <option key={c} value={c} />)}
                        </datalist>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-neutral-500">Tracking Number</label>
                        <input
                          value={trackingInput}
                          onChange={e => setTrackingInput(e.target.value)}
                          placeholder="Enter tracking code..."
                          className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-neutral-900 focus:outline-none focus:border-black transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-neutral-500">Tracking Website URL</label>
                        <input
                          type="url"
                          value={trackingUrlInput}
                          onChange={e => setTrackingUrlInput(e.target.value)}
                          placeholder="https://courier.example.com/track"
                          className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-black transition-colors"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveTracking}
                        disabled={updatingId === fullOrder.id}
                        className="w-full bg-black hover:bg-neutral-800 disabled:opacity-50 text-white font-semibold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Truck className="w-3.5 h-3.5" /> Save Tracking Information
                      </button>
                    </div>
                  </div>

                  {/* Order Items Breakdown */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Ordered Products</h4>
                    <div className="border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-100">
                      {fullOrder.items?.map(item => {
                        let imgUrl: string | null = item.product_image || null
                        if (!imgUrl && item.product_images) {
                          if (Array.isArray(item.product_images) && item.product_images[0]) imgUrl = item.product_images[0]
                        }
                        return (
                          <div key={item.id} className="p-2.5 flex items-center justify-between gap-3 text-xs bg-white">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {imgUrl ? (
                                <Image src={imgUrl} alt={item.product_name || 'Product'} width={32} height={32} unoptimized className="w-8 h-8 rounded-lg object-cover bg-neutral-100 border border-neutral-200 flex-shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center flex-shrink-0">
                                  <Package className="w-4 h-4 text-neutral-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-neutral-900 truncate max-w-[160px]">{item.product_name}</p>
                                <p className="text-neutral-400 text-[11px]">
                                  {item.size ? `Size: ${item.size} • ` : ''}Qty: {item.quantity}
                                </p>
                              </div>
                            </div>
                            <span className="font-bold text-neutral-900 text-xs flex-shrink-0">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Price Summary */}
                  <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/80 text-xs space-y-1.5">
                    <div className="flex justify-between text-neutral-600">
                      <span>Subtotal</span>
                      <span>{formatPrice(fullOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>Shipping Fee</span>
                      <span>{fullOrder.shipping_cost === 0 ? 'Free' : formatPrice(fullOrder.shipping_cost)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-neutral-950 text-sm pt-1 border-t border-neutral-200/80">
                      <span>Total Amount</span>
                      <span>{formatPrice(fullOrder.total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
