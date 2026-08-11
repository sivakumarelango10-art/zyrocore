'use client'

import { useEffect, useState } from 'react'
import AdminShell from '../admin-shell'
import { AlertTriangle, Package, Search, Save, RotateCcw, Plus, Minus, Layers } from 'lucide-react'
import { toast } from 'sonner'

const STOCK_LEVEL = (stock: number) => {
  if (stock === 0) return { label: 'Out of Stock', cls: 'text-red-700 bg-red-50 border border-red-200' }
  if (stock <= 5)  return { label: 'Critical',     cls: 'text-red-700 bg-red-50 border border-red-200' }
  if (stock <= 10) return { label: 'Low Stock',    cls: 'text-amber-700 bg-amber-50 border border-amber-200' }
  return              { label: 'In Stock',         cls: 'text-emerald-700 bg-emerald-50 border border-emerald-200' }
}

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Size stock state per product ID: { [productId]: { [size]: quantity } }
  const [sizeStockMap, setSizeStockMap] = useState<Record<number, Record<string, number>>>({})
  const [savingId, setSavingId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/products')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const list = data?.products ?? []
        setProducts(list)
        setFiltered(list)

        const initialMap: Record<number, Record<string, number>> = {}
        list.forEach((p: any) => {
          const sizes = p.sizes && p.sizes.length > 0 ? p.sizes : ['S', 'M', 'L', 'XL', 'XXL']
          const currentSizeStock = p.size_stock || {}
          const itemMap: Record<string, number> = {}
          sizes.forEach((s: string) => {
            itemMap[s] = Math.max(0, currentSizeStock[s] ?? 0)
          })
          initialMap[p.id] = itemMap
        })
        setSizeStockMap(initialMap)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(products.filter(p => p.name.toLowerCase().includes(q) || (p.category_name || '').toLowerCase().includes(q)))
  }, [search, products])

  const lowStockCount = products.filter(p => p.stock <= 10).length

  // Adjust size stock quantity
  const handleQuantityChange = (productId: number, size: string, newQty: number) => {
    const validQty = Math.max(0, newQty)
    setSizeStockMap(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [size]: validQty,
      },
    }))
  }

  const handleSaveSizeStock = async (product: any) => {
    setSavingId(product.id)
    const updatedSizeStock = sizeStockMap[product.id] || {}
    const computedTotalStock = Object.values(updatedSizeStock).reduce((acc, curr) => acc + Math.max(0, Number(curr) || 0), 0)
    const updatedSizes = Array.isArray(product.sizes) && product.sizes.length > 0
      ? Array.from(new Set([...product.sizes, ...Object.keys(updatedSizeStock)]))
      : Object.keys(updatedSizeStock)

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...product,
          sizes: updatedSizes,
          size_stock: updatedSizeStock,
          stock: computedTotalStock,
        }),
      })

      if (res.ok) {
        toast.success(`Size stock updated for "${product.name}". Overall stock = ${computedTotalStock}`)
        load()
      } else {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error || 'Failed to update size stock')
      }
    } catch {
      toast.error('Network error saving inventory')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <AdminShell>
      <div className="p-6 space-y-6 max-w-5xl pb-12">
        <div>
          <h1 className="text-neutral-900 text-2xl font-bold tracking-tight">Size-Level Inventory</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Manage stock quantities independently for each size. Overall total stock is calculated automatically.</p>
        </div>

        {/* Alert banner */}
        {lowStockCount > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <p className="text-amber-800 text-sm font-semibold">
              {lowStockCount} product{lowStockCount > 1 ? 's' : ''} with low stock (&le; 10 units). Adjust size quantities below.
            </p>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products by name or category..."
            suppressHydrationWarning
            className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-neutral-900 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors"
          />
        </div>

        {/* Product Inventory Cards */}
        {loading ? (
          <div className="py-20 text-center text-neutral-400 text-sm font-medium">Loading inventory data...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center bg-white border border-neutral-200 rounded-2xl">
            <Package className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm font-medium">No products found matching your search</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(p => {
              const currentSizeMap = sizeStockMap[p.id] || {}
              const computedOverallStock = Object.values(currentSizeMap).reduce((acc, curr) => acc + Math.max(0, Number(curr) || 0), 0)
              const level = STOCK_LEVEL(computedOverallStock)

              // Check if modified compared to DB
              const dbSizeMap = p.size_stock || {}
              const isModified = Object.keys(currentSizeMap).some(s => (currentSizeMap[s] ?? 0) !== (dbSizeMap[s] ?? 0))

              const sizes = p.sizes && p.sizes.length > 0 ? p.sizes : Object.keys(currentSizeMap)

              return (
                <div key={p.id} className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4">
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt="" className="w-10 h-10 rounded-xl object-cover bg-neutral-100 border border-neutral-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center border border-neutral-200">
                          <Package className="w-5 h-5 text-neutral-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-neutral-900 text-base">{p.name}</h3>
                        <p className="text-xs text-neutral-500">{p.category_name || 'Uncategorized'} • Price: ₹{p.price}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${level.cls}`}>
                        {level.label}
                      </span>
                      <div className="bg-neutral-100 border border-neutral-200 px-3 py-1 rounded-xl text-xs font-semibold text-neutral-700">
                        Overall Stock: <span className="font-mono font-bold text-neutral-900 text-sm">{computedOverallStock}</span>
                      </div>
                    </div>
                  </div>

                  {/* Size Stock Management Grid */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-neutral-400" /> Size Quantities
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {sizes.map((size: string) => {
                        const qty = currentSizeMap[size] ?? 0
                        return (
                          <div key={size} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-200 shadow-2xs">
                                {size}
                              </span>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                qty === 0 ? 'text-red-700 bg-red-50' : qty <= 5 ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50'
                              }`}>
                                {qty === 0 ? 'Out' : `${qty} left`}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(p.id, size, qty - 1)}
                                className="w-7 h-7 rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100 flex items-center justify-center transition-colors text-xs font-bold"
                                title="Decrease stock"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={qty}
                                onChange={e => handleQuantityChange(p.id, size, parseInt(e.target.value) || 0)}
                                className="w-full bg-white border border-neutral-200 rounded-lg py-1 px-1 text-center font-mono font-bold text-neutral-900 text-sm focus:outline-none focus:border-black transition-colors"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(p.id, size, qty + 1)}
                                className="w-7 h-7 rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100 flex items-center justify-center transition-colors text-xs font-bold"
                                title="Increase stock"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Save Action */}
                  {isModified && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                      <button
                        type="button"
                        onClick={() => {
                          const dbMap: Record<string, number> = {}
                          sizes.forEach((s: string) => { dbMap[s] = p.size_stock?.[s] ?? 0 })
                          setSizeStockMap(prev => ({ ...prev, [p.id]: dbMap }))
                        }}
                        className="px-3 py-1.5 rounded-xl border border-neutral-200 text-neutral-600 text-xs font-semibold hover:bg-neutral-50 transition-colors flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveSizeStock(p)}
                        disabled={savingId === p.id}
                        className="px-4 py-1.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {savingId === p.id ? 'Saving Stock...' : 'Save Size Stock'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
