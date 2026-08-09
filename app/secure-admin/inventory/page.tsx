'use client'

import { useEffect, useState } from 'react'
import AdminShell from '../admin-shell'
import { AlertTriangle, Package, Search, Save } from 'lucide-react'
import { toast } from 'sonner'

const STOCK_LEVEL = (stock: number) => {
  if (stock === 0) return { label: 'Out of Stock', cls: 'text-red-700 bg-red-50 border border-red-200' }
  if (stock <= 5)  return { label: 'Critical',     cls: 'text-red-700 bg-red-50 border border-red-200' }
  if (stock <= 10) return { label: 'Low Stock',    cls: 'text-amber-700 bg-amber-50 border border-amber-200' }
  return              { label: 'In Stock',         cls: 'text-green-700 bg-green-50 border border-green-200' }
}

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editStock, setEditStock] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/products')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const list = data?.products ?? []
        setProducts(list)
        setFiltered(list)
      }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(products.filter(p => p.name.toLowerCase().includes(q)))
  }, [search, products])

  const lowStockCount = products.filter(p => p.stock <= 10).length

  const handleSaveStock = async (p: any) => {
    const newStock = parseInt(editStock[p.id] ?? p.stock)
    if (isNaN(newStock) || newStock < 0) { toast.error('Invalid stock value'); return }
    setSaving(p.id)
    const res = await fetch(`/api/admin/products/${p.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...p, stock: newStock }),
    })
    if (res.ok) {
      toast.success(`Stock updated for "${p.name}"`)
      setEditStock(prev => { const n = { ...prev }; delete n[p.id]; return n })
      load()
    } else toast.error('Failed to update stock')
    setSaving(null)
  }

  return (
    <AdminShell>
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-neutral-900 text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Manage stock levels for all products</p>
        </div>

        {/* Alert banner */}
        {lowStockCount > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <p className="text-amber-800 text-sm font-semibold">
              {lowStockCount} product{lowStockCount > 1 ? 's' : ''} with low or no stock. Update quantities below.
            </p>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            suppressHydrationWarning
            className="w-full bg-white border border-neutral-200 rounded-lg pl-9 pr-3 py-2 text-neutral-900 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-20 text-center text-neutral-400 text-sm">Loading inventory...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Package className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
              <p className="text-neutral-500 text-sm">No products found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/50">
                    {['Product', 'Category', 'Status', 'Current Stock', 'Adjust Stock'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const level = STOCK_LEVEL(p.stock)
                    const changed = editStock[p.id] !== undefined && editStock[p.id] !== String(p.stock)
                    return (
                      <tr key={p.id} className="border-b border-neutral-100 hover:bg-neutral-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {p.images?.[0] ? (
                              <img src={p.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover bg-neutral-100 border border-neutral-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center border border-neutral-200">
                                <Package className="w-3.5 h-3.5 text-neutral-400" />
                              </div>
                            )}
                            <span className="text-neutral-900 font-semibold truncate max-w-[160px]">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-neutral-500">{p.category_name || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${level.cls}`}>{level.label}</span>
                        </td>
                        <td className="px-4 py-3 text-neutral-900 font-mono font-semibold text-sm">{p.stock}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={editStock[p.id] ?? p.stock}
                              onChange={e => setEditStock(prev => ({ ...prev, [p.id]: e.target.value }))}
                              suppressHydrationWarning
                              className="w-20 bg-white border border-neutral-200 rounded-lg px-2 py-1.5 text-neutral-900 text-sm text-center focus:outline-none focus:border-black transition-colors"
                            />
                            {changed && (
                              <button
                                onClick={() => handleSaveStock(p)}
                                disabled={saving === p.id}
                                suppressHydrationWarning
                                className="w-7 h-7 rounded-lg bg-black hover:bg-neutral-950 flex items-center justify-center transition-colors disabled:opacity-50"
                              >
                                <Save className="w-3.5 h-3.5 text-white" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
