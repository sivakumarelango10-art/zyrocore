'use client'

import { useEffect, useRef, useState } from 'react'
import AdminShell from '../admin-shell'
import { ShoppingBag, Search, X, ChevronDown, Truck } from 'lucide-react'
import { toast } from 'sonner'

import { formatPrice } from '@/lib/utils-shop'

function fmtDate(s: string) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(s))
}

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
const STATUSES: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending:   'text-amber-700 bg-amber-50 border-amber-200',
  confirmed: 'text-blue-700 bg-blue-50 border-blue-200',
  shipped:   'text-indigo-700 bg-indigo-50 border-indigo-200',
  delivered: 'text-green-700 bg-green-50 border-green-200',
  cancelled: 'text-red-700 bg-red-50 border-red-200',
}

interface Order {
  id: number; status: OrderStatus; total: number; created_at: string
  user_name: string | null; user_email: string | null
  shipping_name: string | null; shipping_address: string | null
  tracking_number: string | null; notes: string | null
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [trackingInput, setTrackingInput] = useState('')

  const statusFilterRef = useRef(statusFilter)

  const load = (status = statusFilterRef.current, silent = false) => {
    if (!silent) setLoading(true)
    const url = status ? `/api/admin/orders?status=${status}&limit=50` : '/api/admin/orders?limit=50'
    fetch(url).then(r => r.ok ? r.json() : null).then(data => {
      setOrders(data?.orders ?? [])
    }).finally(() => {
      if (!silent) setLoading(false)
    })
  }

  useEffect(() => {
    load()
    const handleVisibilityChange = () => {
      if (!document.hidden) load(statusFilterRef.current, true)
    }

    const interval = setInterval(() => {
      if (!document.hidden) load(statusFilterRef.current, true)
    }, 15000)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => clearInterval(interval)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const filtered = orders.filter(o => {
    if (!search) return true
    const q = search.toLowerCase()
    return String(o.id).includes(q) || (o.user_name || '').toLowerCase().includes(q) || (o.user_email || '').toLowerCase().includes(q)
  })

  const handleFilterChange = (s: string) => {
    setStatusFilter(s)
    statusFilterRef.current = s
    load(s)
  }
  const handleStatusUpdate = async (orderId: number, newStatus: OrderStatus, tracking?: string) => {
    setUpdatingId(orderId)
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus, tracking_number: tracking || null }),
    })
    if (res.ok) {
      toast.success(`Order #${orderId} status updated to ${newStatus}`)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, tracking_number: tracking || o.tracking_number } : o))
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus, tracking_number: tracking || prev.tracking_number } : null)
      }
    } else toast.error('Failed to update order')
    setUpdatingId(null)
  }

  return (
    <AdminShell>
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-neutral-900 text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-neutral-500 text-sm mt-0.5">{orders.length} orders total</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by ID or customer..."
              suppressHydrationWarning
              className="bg-white border border-neutral-200 rounded-lg pl-9 pr-3 py-2 text-neutral-900 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors w-64 shadow-sm"
            />
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => handleFilterChange('')}
              suppressHydrationWarning
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${!statusFilter ? 'bg-black text-white' : 'bg-white border border-neutral-200 text-neutral-500 hover:text-black hover:border-neutral-300'}`}
            >
              All
            </button>
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => handleFilterChange(s)}
                suppressHydrationWarning
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${statusFilter === s ? 'bg-black text-white' : 'bg-white border border-neutral-200 text-neutral-500 hover:text-black hover:border-neutral-300'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-5">
          {/* Orders table */}
          <div className="flex-1 bg-white border border-neutral-200 rounded-xl overflow-hidden min-w-0 shadow-sm">
            {loading ? (
              <div className="py-20 text-center text-neutral-400 text-sm">Loading orders...</div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <ShoppingBag className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
                <p className="text-neutral-500 text-sm">No orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50/50">
                      {['Order', 'Customer', 'Status', 'Total', 'Date', 'Action'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(order => (
                      <tr
                        key={order.id}
                        onClick={() => { setSelectedOrder(order); setTrackingInput(order.tracking_number || '') }}
                        className={`border-b border-neutral-100 cursor-pointer transition-colors ${selectedOrder?.id === order.id ? 'bg-neutral-50' : 'hover:bg-neutral-50/30'}`}
                      >
                        <td className="px-4 py-3 text-neutral-400 font-mono text-xs">#{order.id}</td>
                        <td className="px-4 py-3">
                          <p className="text-neutral-900 font-semibold">{order.user_name || 'Guest'}</p>
                          <p className="text-neutral-400 text-xs truncate max-w-[140px]">{order.user_email || ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-md border font-medium capitalize ${STATUS_STYLE[order.status] ?? 'text-neutral-600 bg-neutral-50 border-neutral-200'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-950 font-bold">{formatPrice(order.total)}</td>
                        <td className="px-4 py-3 text-neutral-500 text-xs">{fmtDate(order.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="relative inline-block">
                            <select
                              value={order.status}
                              onChange={e => { e.stopPropagation(); handleStatusUpdate(order.id, e.target.value as OrderStatus) }}
                              disabled={updatingId === order.id}
                              onClick={e => e.stopPropagation()}
                              suppressHydrationWarning
                              className="appearance-none bg-white border border-neutral-200 rounded-lg pl-2.5 pr-6 py-1 text-neutral-900 text-xs focus:outline-none focus:border-black transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                            </select>
                            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400 pointer-events-none" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Order detail panel */}
          {selectedOrder && (
            <div className="w-72 flex-shrink-0 bg-white border border-neutral-200 rounded-xl p-4 space-y-4 self-start shadow-md">
              <div className="flex items-center justify-between">
                <h3 className="text-neutral-900 text-sm font-bold">Order #{selectedOrder.id}</h3>
                <button onClick={() => setSelectedOrder(null)} suppressHydrationWarning className="text-neutral-400 hover:text-black transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-semibold text-xs uppercase tracking-wider">Status</span>
                  <span className={`text-xs px-2 py-0.5 rounded-md border font-medium capitalize ${STATUS_STYLE[selectedOrder.status] ?? ''}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-semibold text-xs uppercase tracking-wider">Total</span>
                  <span className="text-neutral-950 font-bold">{formatPrice(selectedOrder.total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-semibold text-xs uppercase tracking-wider">Date</span>
                  <span className="text-neutral-600 text-xs">{fmtDate(selectedOrder.created_at)}</span>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-3 space-y-2">
                <p className="text-neutral-400 text-xs uppercase tracking-wider font-semibold">Customer</p>
                <p className="text-neutral-900 text-sm font-semibold">{selectedOrder.user_name || 'Guest'}</p>
                {selectedOrder.user_email && <p className="text-neutral-500 text-xs">{selectedOrder.user_email}</p>}
                {selectedOrder.shipping_name && <p className="text-neutral-600 text-xs">{selectedOrder.shipping_name}</p>}
                {selectedOrder.shipping_address && <p className="text-neutral-500 text-xs">{selectedOrder.shipping_address}</p>}
              </div>

              {/* Tracking number */}
              <div className="border-t border-neutral-100 pt-3 space-y-2">
                <p className="text-neutral-400 text-xs uppercase tracking-wider font-semibold">Tracking Number</p>
                <div className="flex gap-2">
                  <input
                    value={trackingInput}
                    onChange={e => setTrackingInput(e.target.value)}
                    placeholder="Enter tracking no."
                    suppressHydrationWarning
                    className="flex-1 bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-900 text-xs placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors"
                  />
                  <button
                    onClick={() => handleStatusUpdate(selectedOrder.id, selectedOrder.status, trackingInput)}
                    disabled={updatingId === selectedOrder.id}
                    suppressHydrationWarning
                    className="bg-black hover:bg-neutral-900 disabled:opacity-50 rounded-lg px-2.5 py-1.5 transition-colors"
                  >
                    <Truck className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>

              {/* Quick status update */}
              <div className="border-t border-neutral-100 pt-3 space-y-2">
                <p className="text-neutral-400 text-xs uppercase tracking-wider font-semibold">Update Status</p>
                <div className="grid grid-cols-1 gap-1">
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusUpdate(selectedOrder.id, s)}
                      disabled={selectedOrder.status === s || updatingId === selectedOrder.id}
                      suppressHydrationWarning
                      className={`text-xs px-3 py-1.5 rounded-lg text-left capitalize transition-colors disabled:cursor-default ${
                        selectedOrder.status === s
                          ? 'bg-neutral-100 text-neutral-900 font-semibold border border-neutral-200'
                          : 'text-neutral-500 hover:text-black hover:bg-neutral-50 disabled:opacity-50'
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
