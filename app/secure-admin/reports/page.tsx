'use client'

import { useEffect, useState } from 'react'
import AdminShell from '../admin-shell'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { Download, TrendingUp, DollarSign, ShoppingBag, Users, Award } from 'lucide-react'
import { toast } from 'sonner'

import GeminiSalesAnalysis from '@/components/admin/gemini-sales-analysis'

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

const COLORS = ['#000000', '#2563eb', '#16a34a', '#eab308', '#dc2626', '#8b5cf6']

export default function ReportsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/reports')
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => toast.error('Failed to load report data'))
      .finally(() => setLoading(false))
  }, [])

  const exportCSV = () => {
    if (!data) return

    let csvContent = 'data:text/csv;charset=utf-8,'

    // 1. Monthly Revenue & Sales
    csvContent += 'MONTHLY SALES & REVENUE REPORT\n'
    csvContent += 'Month,Total Orders,Total Revenue (INR),Delivered Revenue (INR)\n'
    data.monthlySales?.forEach((m: any) => {
      csvContent += `"${m.month}",${m.orders},${m.revenue},${m.deliveredRevenue}\n`
    })
    csvContent += '\n'

    // 2. Product Performance
    csvContent += 'PRODUCT PERFORMANCE REPORT\n'
    csvContent += 'Product Name,Units Sold,Total Revenue (INR)\n'
    data.productPerformance?.forEach((p: any) => {
      csvContent += `"${p.product_name.replace(/"/g, '""')}",${p.units_sold},${p.total_revenue}\n`
    })
    csvContent += '\n'

    // 3. Customer Growth
    csvContent += 'CUSTOMER GROWTH REPORT\n'
    csvContent += 'Month,New Registered Customers\n'
    data.customerGrowth?.forEach((c: any) => {
      csvContent += `"${c.month}",${c.new_customers}\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `zyrocore_reports_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Report CSV downloaded successfully!')
  }

  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-neutral-900 text-2xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-neutral-500 text-sm mt-0.5">Comprehensive sales, revenue, product, and customer growth performance</p>
          </div>
          <button
            onClick={exportCSV}
            disabled={loading || !data}
            suppressHydrationWarning
            className="inline-flex items-center gap-2 bg-black hover:bg-neutral-900 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            Export CSV Report
          </button>
        </div>

        {/* Gemini AI Sales Intelligence */}
        <GeminiSalesAnalysis />

        {loading ? (
          <div className="py-20 text-center text-neutral-400 text-sm font-medium">Generating performance reports...</div>
        ) : (
          <div className="space-y-6">
            {/* Revenue & Sales Trend Line Chart */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-neutral-900 text-base font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-black" /> Monthly Revenue & Sales Trend
                  </h2>
                  <p className="text-neutral-400 text-xs mt-0.5">Total revenue generated per month</p>
                </div>
              </div>

              {data?.monthlySales?.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-neutral-400 text-sm">No sales records available yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.monthlySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fill: '#666', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(val: any) => formatINR(Number(val))}
                      contentStyle={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8 }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Total Revenue (₹)" stroke="#000000" strokeWidth={2.5} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="deliveredRevenue" name="Delivered Revenue (₹)" stroke="#16a34a" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Grid for Orders by Month & Order Status Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Orders Bar Chart */}
              <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
                <div>
                  <h2 className="text-neutral-900 text-base font-bold flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-black" /> Monthly Order Volumes
                  </h2>
                  <p className="text-neutral-400 text-xs mt-0.5">Volume of completed & active orders</p>
                </div>

                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data?.monthlySales || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fill: '#666', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#666', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8 }} />
                    <Bar dataKey="orders" name="Total Orders" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Status Distribution Pie Chart */}
              <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
                <div>
                  <h2 className="text-neutral-900 text-base font-bold flex items-center gap-2">
                    <Award className="w-5 h-5 text-black" /> Order Status Breakdown
                  </h2>
                  <p className="text-neutral-400 text-xs mt-0.5">Distribution of order states across all time</p>
                </div>

                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={data?.statusDistribution || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {data?.statusDistribution?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Grid for Product Performance & Customer Growth */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Product Performance Table */}
              <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
                <div>
                  <h2 className="text-neutral-900 text-base font-bold flex items-center gap-2">
                    <Award className="w-5 h-5 text-black" /> Top Performing Products
                  </h2>
                  <p className="text-neutral-400 text-xs mt-0.5">Products ranked by total generated revenue</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50/50 text-left">
                        <th className="py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase">Product</th>
                        <th className="py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase">Units Sold</th>
                        <th className="py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.productPerformance?.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-neutral-400 text-sm">No sales data recorded yet.</td>
                        </tr>
                      ) : (
                        data?.productPerformance?.map((p: any, i: number) => (
                          <tr key={i} className="border-b border-neutral-100 hover:bg-neutral-50/40">
                            <td className="py-2.5 px-3 font-semibold text-neutral-900 truncate max-w-[180px]">{p.product_name}</td>
                            <td className="py-2.5 px-3 text-neutral-600 font-mono">{p.units_sold}</td>
                            <td className="py-2.5 px-3 font-bold text-neutral-950">{formatINR(p.total_revenue)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Customer Growth Bar Chart */}
              <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
                <div>
                  <h2 className="text-neutral-900 text-base font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-black" /> Customer Registration Growth
                  </h2>
                  <p className="text-neutral-400 text-xs mt-0.5">New user registrations per month</p>
                </div>

                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data?.customerGrowth || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fill: '#666', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#666', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8 }} />
                    <Bar dataKey="new_customers" name="New Customers" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
