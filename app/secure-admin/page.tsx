'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdminShell from './admin-shell'
import {
  IndianRupee, ShoppingBag, Package, AlertTriangle,
  ArrowUpRight, TrendingUp, PackagePlus,
  ClipboardList, Layers, BarChart2, Users, UserCheck, Activity, FileText
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Stats {
  revenue: number
  orders: number
  users: number
  products: number
  lowStock: number
  productsSold: number
  newCustomers: number
  returningCustomers: number
  activeUsers: number
}

interface RecentOrder {
  id: number
  status: string
  total: number
  created_at: string
  user_name: string | null
}

interface StatusCount {
  status: string
  count: string
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(s: string) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(s))
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-amber-700 bg-amber-50 border border-amber-200',
  confirmed: 'text-blue-700 bg-blue-50 border border-blue-200',
  shipped: 'text-indigo-700 bg-indigo-50 border border-indigo-200',
  delivered: 'text-green-700 bg-green-50 border border-green-200',
  cancelled: 'text-red-700 bg-red-50 border border-red-200',
}

const StatCard = ({ label, value, icon: Icon, sub, gold, danger }: {
  label: string; value: string; icon: React.ElementType; sub?: string; gold?: boolean; danger?: boolean
}) => (
  <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-start gap-4 shadow-sm">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
      gold ? 'bg-black text-white' : danger ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-neutral-100 text-neutral-700'
    }`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
      {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
    </div>
  </div>
)

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setStats(data.stats)
          setRecentOrders(data.recentOrders || [])
          setStatusCounts(data.ordersByStatus || [])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const chartData = statusCounts.map(s => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    orders: parseInt(s.count),
  }))

  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-neutral-900 text-2xl font-bold tracking-tight">Dashboard Overview</h1>
            <p className="text-neutral-500 text-sm mt-0.5">Real-time store metrics, order status, and inventory alerts</p>
          </div>
          <Link
            href="/secure-admin/products/new"
            className="inline-flex items-center gap-2 bg-black hover:bg-neutral-900 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <PackagePlus className="w-4 h-4" />
            Add Product
          </Link>
        </div>

        {/* Primary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Revenue" value={loading ? '...' : formatINR(stats?.revenue ?? 0)} icon={IndianRupee} gold sub="Completed sales" />
          <StatCard label="Total Orders" value={loading ? '...' : String(stats?.orders ?? 0)} icon={ShoppingBag} sub="All time orders" />
          <StatCard label="Products Sold" value={loading ? '...' : String(stats?.productsSold ?? 0)} icon={Package} sub="Units purchased" />
          <StatCard
            label="Low Stock Warning"
            value={loading ? '...' : String(stats?.lowStock ?? 0)}
            icon={AlertTriangle}
            danger={!!(stats?.lowStock && stats.lowStock > 0)}
            sub={stats?.lowStock ? 'Items at 10 or fewer stock' : 'Stock levels healthy'}
          />
        </div>

        {/* Secondary Stat Cards (Customer Metrics) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Registered Customers" value={loading ? '...' : String(stats?.users ?? 0)} icon={Users} sub="Total accounts" />
          <StatCard label="New Customers (This Month)" value={loading ? '...' : String(stats?.newCustomers ?? 0)} icon={TrendingUp} sub="Recent signups" />
          <StatCard label="Returning Customers" value={loading ? '...' : String(stats?.returningCustomers ?? 0)} icon={UserCheck} sub="> 1 order placed" />
          <StatCard label="Active Users (30 Days)" value={loading ? '...' : String(stats?.activeUsers ?? 0)} icon={Activity} sub="Recent user logins" />
        </div>

        {/* Charts + Recent orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Orders by status chart */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-neutral-900 text-sm font-bold mb-4">Orders by Status</h2>
            {chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-neutral-400 text-sm">No orders yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, color: '#000' }}
                    cursor={{ fill: '#00000005' }}
                  />
                  <Bar dataKey="orders" fill="#000" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent orders */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-neutral-900 text-sm font-bold">Recent Orders</h2>
              <Link href="/secure-admin/orders" className="text-black font-semibold text-xs hover:underline flex items-center gap-1">
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-neutral-400 text-sm">No orders yet</div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-400 text-xs font-mono">#{order.id}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium border ${STATUS_COLOR[order.status] ?? 'text-neutral-600 bg-neutral-50 border-neutral-200'}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-neutral-900 text-sm font-semibold truncate mt-0.5">{order.user_name || 'Guest'}</p>
                      <p className="text-neutral-400 text-xs">{fmtDate(order.created_at)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-neutral-950 font-bold text-sm">{formatINR(order.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/secure-admin/products/new', label: 'Add New Product', icon: PackagePlus },
            { href: '/secure-admin/customers',     label: 'Customer Directory', icon: Users },
            { href: '/secure-admin/reports',       label: 'Sales Reports',      icon: FileText },
            { href: '/secure-admin/inventory',     label: 'Stock Inventory',   icon: Layers },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="bg-white border border-neutral-200 hover:border-black rounded-xl p-4 flex items-center gap-3 transition-all duration-200 shadow-sm hover:shadow-md group"
            >
              <div className="w-8 h-8 bg-neutral-100 group-hover:bg-black rounded-lg flex items-center justify-center transition-colors">
                <Icon className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-neutral-700 group-hover:text-neutral-950 text-sm font-semibold transition-colors">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </AdminShell>
  )
}
