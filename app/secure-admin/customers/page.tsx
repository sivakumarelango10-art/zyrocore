'use client'

import { useEffect, useState } from 'react'
import AdminShell from '../admin-shell'
import {
  Users, Search, Download, ShieldAlert, ShieldCheck,
  ShoppingBag, Calendar, Mail, User, Clock, ArrowUpDown, Filter, Eye
} from 'lucide-react'
import { toast } from 'sonner'

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(s: string | null) {
  if (!s) return 'Never'
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(s))
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'created' | 'spent' | 'orders' | 'logins'>('created')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<number | null>(null)
  const [activeModalUser, setActiveModalUser] = useState<any | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/customers')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const list = d?.customers || []
        setCustomers(list)
      })
      .catch(() => toast.error('Failed to load customers'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    let result = [...customers]

    // 1. Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
    }

    // 2. Status filter
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter)
    }

    // 3. Sorting
    if (sortBy === 'created') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortBy === 'spent') {
      result.sort((a, b) => b.total_spent - a.total_spent)
    } else if (sortBy === 'orders') {
      result.sort((a, b) => b.total_orders - a.total_orders)
    } else if (sortBy === 'logins') {
      result.sort((a, b) => b.login_count - a.login_count)
    }

    setFiltered(result)
  }, [search, statusFilter, sortBy, customers])

  const toggleStatus = async (customer: any) => {
    const nextStatus = customer.status === 'suspended' ? 'active' : 'suspended'
    setUpdating(customer.id)
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: customer.id, status: nextStatus }),
      })
      if (res.ok) {
        toast.success(`Customer ${customer.name} status set to ${nextStatus}`)
        load()
      } else {
        toast.error('Failed to update customer status')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setUpdating(null)
    }
  }

  const exportCSV = () => {
    if (filtered.length === 0) return

    let csvContent = 'data:text/csv;charset=utf-8,'
    csvContent += 'ID,Name,Email,Status,Total Orders,Total Spent (INR),Login Count,Last Login,Registered Date\n'

    filtered.forEach(c => {
      csvContent += `"${c.id}","${c.name.replace(/"/g, '""')}","${c.email}","${c.status}",${c.total_orders},${c.total_spent},${c.login_count},"${c.last_login_at ? c.last_login_at : 'Never'}","${c.created_at}"\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `zyrocore_customers_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Customer CSV exported successfully!')
  }

  const totalLogins = customers.reduce((sum, c) => sum + (c.login_count || 0), 0)

  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-neutral-900 text-2xl font-bold tracking-tight">Customer Management</h1>
            <p className="text-neutral-500 text-sm mt-0.5">View customer profiles, order history, activity logs, and account status</p>
          </div>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            suppressHydrationWarning
            className="inline-flex items-center gap-2 bg-black hover:bg-neutral-900 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            Export Customer CSV
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider">Registered Customers</p>
              <p className="text-2xl font-bold text-neutral-900">{customers.length}</p>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider">Total Customer Logins</p>
              <p className="text-2xl font-bold text-neutral-900">{totalLogins}</p>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider">Active Accounts</p>
              <p className="text-2xl font-bold text-neutral-900">{customers.filter(c => c.status === 'active').length}</p>
            </div>
          </div>
        </div>

        {/* Search, Filter & Sort toolbar */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by customer name or email..."
              suppressHydrationWarning
              className="w-full bg-white border border-neutral-200 rounded-lg pl-9 pr-3 py-2 text-neutral-900 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-600">
              <Filter className="w-3.5 h-3.5" />
              <span className="font-semibold">Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                suppressHydrationWarning
                className="bg-transparent border-0 font-medium focus:outline-none text-neutral-900 cursor-pointer"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-600">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="font-semibold">Sort By:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                suppressHydrationWarning
                className="bg-transparent border-0 font-medium focus:outline-none text-neutral-900 cursor-pointer"
              >
                <option value="created">Recently Registered</option>
                <option value="spent">Highest Total Spent</option>
                <option value="orders">Most Orders</option>
                <option value="logins">Most Logins</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer Table */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-20 text-center text-neutral-400 text-sm font-medium">Loading customers...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-600 font-semibold text-base">No customers found</p>
              <p className="text-neutral-400 text-xs mt-1">Try adjusting your search terms or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/50 text-left">
                    <th className="py-3 px-4 text-xs font-semibold text-neutral-500 uppercase">Customer</th>
                    <th className="py-3 px-4 text-xs font-semibold text-neutral-500 uppercase">Status</th>
                    <th className="py-3 px-4 text-xs font-semibold text-neutral-500 uppercase">Orders</th>
                    <th className="py-3 px-4 text-xs font-semibold text-neutral-500 uppercase">Total Spent</th>
                    <th className="py-3 px-4 text-xs font-semibold text-neutral-500 uppercase">Logins</th>
                    <th className="py-3 px-4 text-xs font-semibold text-neutral-500 uppercase">Last Login</th>
                    <th className="py-3 px-4 text-xs font-semibold text-neutral-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="border-b border-neutral-100 hover:bg-neutral-50/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-800 font-bold flex items-center justify-center text-sm border border-neutral-200">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-neutral-900 font-semibold text-sm">{c.name}</p>
                            <p className="text-neutral-400 text-xs">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border ${
                          c.status === 'suspended'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                        }`}>
                          {c.status === 'suspended' ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                          {c.status === 'suspended' ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-neutral-900">{c.total_orders} order{c.total_orders === 1 ? '' : 's'}</td>
                      <td className="py-3.5 px-4 font-bold text-neutral-950">{formatINR(c.total_spent)}</td>
                      <td className="py-3.5 px-4 font-mono text-neutral-600">{c.login_count}</td>
                      <td className="py-3.5 px-4 text-neutral-500 text-xs">{fmtDate(c.last_login_at)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setActiveModalUser(c)}
                            title="View Activity Logs"
                            suppressHydrationWarning
                            className="p-1.5 rounded-lg border border-neutral-200 hover:border-black text-neutral-600 hover:text-black transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleStatus(c)}
                            disabled={updating === c.id}
                            suppressHydrationWarning
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                              c.status === 'suspended'
                                ? 'bg-black text-white hover:bg-neutral-800 border-black'
                                : 'bg-neutral-50 text-red-600 hover:bg-red-50 border-neutral-200 hover:border-red-200'
                            }`}
                          >
                            {updating === c.id ? 'Updating...' : c.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity Log Modal */}
        {activeModalUser && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-neutral-200 max-w-lg w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="text-neutral-900 font-bold text-lg">Customer Activity Profile</h3>
                <button onClick={() => setActiveModalUser(null)} className="text-neutral-400 hover:text-black font-bold">✕</button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 space-y-1">
                  <p className="font-bold text-neutral-900">{activeModalUser.name}</p>
                  <p className="text-xs text-neutral-500">{activeModalUser.email}</p>
                  <p className="text-xs text-neutral-400 pt-1">Registered on: {fmtDate(activeModalUser.created_at)}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 border border-neutral-200 rounded-lg">
                    <p className="text-xs text-neutral-500 font-semibold uppercase">Total Spending</p>
                    <p className="text-lg font-bold text-black mt-0.5">{formatINR(activeModalUser.total_spent)}</p>
                  </div>
                  <div className="bg-white p-3 border border-neutral-200 rounded-lg">
                    <p className="text-xs text-neutral-500 font-semibold uppercase">Orders Completed</p>
                    <p className="text-lg font-bold text-black mt-0.5">{activeModalUser.total_orders}</p>
                  </div>
                </div>

                <div className="space-y-2 border-t border-neutral-100 pt-3">
                  <p className="text-xs font-bold uppercase text-neutral-500">Security & Activity Log</p>
                  <div className="text-xs space-y-1.5 text-neutral-600">
                    <div className="flex justify-between py-1 border-b border-neutral-100">
                      <span>Total System Logins:</span>
                      <span className="font-mono font-bold text-neutral-900">{activeModalUser.login_count}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-neutral-100">
                      <span>Last Login Timestamp:</span>
                      <span className="font-semibold text-neutral-900">{fmtDate(activeModalUser.last_login_at)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Account Status:</span>
                      <span className={`font-bold capitalize ${activeModalUser.status === 'suspended' ? 'text-red-600' : 'text-green-600'}`}>
                        {activeModalUser.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setActiveModalUser(null)}
                  className="bg-black text-white px-4 py-2 rounded-lg text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
