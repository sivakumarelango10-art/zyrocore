'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import AdminShell from '../admin-shell'
import { Plus, Pencil, Trash2, Search, Package, Home, Eye, EyeOff, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { formatPrice } from '@/lib/utils-shop'

const STOCK_BADGE = (stock: number) => {
  if (stock === 0) return 'text-red-700 bg-red-50 border-red-200'
  if (stock < 10) return 'text-amber-700 bg-amber-50 border-amber-200'
  return 'text-green-700 bg-green-50 border-green-200'
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/products')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const list = data?.products ?? []
        setProducts(list)
        setFiltered(list)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()

    const handleRealtimeUpdate = () => {
      load()
    }
    window.addEventListener('zyrocore-realtime-update', handleRealtimeUpdate)

    return () => {
      window.removeEventListener('zyrocore-realtime-update', handleRealtimeUpdate)
    }
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(products.filter(p =>
      p.name.toLowerCase().includes(q) || (p.category_name || '').toLowerCase().includes(q)
    ))
  }, [search, products])

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      toast.success('Product deleted')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zyrocore-realtime-update'))
      }
      load()
    } else {
      toast.error('Failed to delete product')
    }
    setDeletingId(null)
  }

  const handleToggleShowOnHome = async (p: any) => {
    setTogglingId(p.id)
    const nextVal = !p.show_on_home
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show_on_home: nextVal }),
      })
      if (res.ok) {
        toast.success(`"${p.name}" ${nextVal ? 'will now show on Home page' : 'removed from Home page'}`)
        load()
      } else {
        toast.error('Failed to update product visibility')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <AdminShell>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-neutral-900 text-2xl font-bold tracking-tight">Products</h1>
            <p className="text-neutral-500 text-sm mt-0.5">{products.length} total products</p>
          </div>
          <Link
            href="/secure-admin/products/new"
            className="inline-flex items-center gap-2 bg-black hover:bg-neutral-900 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Link>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            suppressHydrationWarning
            className="w-full bg-white border border-neutral-200 rounded-lg pl-9 pr-3 py-2 text-neutral-900 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-20 text-center text-neutral-400 text-sm">Loading products...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Package className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
              <p className="text-neutral-500 text-sm">{search ? 'No products match your search' : 'No products yet'}</p>
              {!search && (
                <Link href="/secure-admin/products/new" className="text-black font-semibold text-sm hover:underline mt-2 inline-block">
                  Add your first product
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/50">
                    {['Product', 'Category', 'Price', 'Stock', 'Flags', 'Show on Home', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b border-neutral-100 hover:bg-neutral-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.images?.[0] ? (
                            <Image src={p.images[0]} alt={p.name} width={36} height={36} unoptimized className="w-9 h-9 rounded-lg object-cover bg-neutral-100 border border-neutral-200" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center border border-neutral-200">
                              <Package className="w-4 h-4 text-neutral-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-neutral-900 font-semibold truncate max-w-[200px]">{p.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{p.category_name || '—'}</td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-neutral-900 font-bold">
                            {formatPrice(p.discount_price ?? p.price)}
                          </span>
                          {p.discount_price && (
                            <span className="ml-1.5 text-neutral-400 line-through text-xs">{formatPrice(p.price)}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${STOCK_BADGE(p.stock)}`}>
                          {p.stock === 0 ? 'Out of stock' : `${p.stock} units`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {p.is_featured && (
                            <span className="text-neutral-800 border border-neutral-300 text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded font-semibold">Featured</span>
                          )}
                          {p.is_best_seller && (
                            <span className="text-amber-800 border border-amber-200 text-[10px] bg-amber-50 px-1.5 py-0.5 rounded font-semibold">Best Seller</span>
                          )}
                          {!p.is_featured && !p.is_best_seller && (
                            <span className="text-neutral-400 text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleShowOnHome(p)}
                          disabled={togglingId === p.id}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                            p.show_on_home
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:bg-neutral-100'
                          }`}
                          title="Click to toggle homepage visibility"
                        >
                          <Home className="w-3.5 h-3.5" />
                          {p.show_on_home ? 'ON (Home)' : 'OFF'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/secure-admin/products/${p.id}/edit`}
                            className="w-7 h-7 rounded-lg bg-neutral-100 hover:bg-black text-neutral-600 hover:text-white flex items-center justify-center transition-colors group"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            disabled={deletingId === p.id}
                            suppressHydrationWarning
                            className="w-7 h-7 rounded-lg bg-neutral-100 hover:bg-red-50 text-neutral-600 hover:text-red-600 flex items-center justify-center transition-colors group disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>
    </AdminShell>
  )
}
