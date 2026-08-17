'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import AdminShell from '../admin-shell'
import {
  AlertTriangle, Package, Search, Save, RotateCcw,
  Plus, Minus, Layers, RefreshCw, CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'

interface InventoryProduct {
  id: number
  name: string
  images: string[]
  sizes: string[]
  size_stock: Record<string, number>
  stock: number
  category_name: string | null
}

const STOCK_LEVEL = (stock: number) => {
  if (stock === 0) return { label: 'Out of Stock', cls: 'text-red-700 bg-red-50 border border-red-200' }
  if (stock <= 5)  return { label: 'Critical',     cls: 'text-red-700 bg-red-50 border border-red-200' }
  if (stock <= 10) return { label: 'Low Stock',    cls: 'text-amber-700 bg-amber-50 border border-amber-200' }
  return              { label: 'In Stock',         cls: 'text-emerald-700 bg-emerald-50 border border-emerald-200' }
}

function parseSafeQty(raw: string | number): number {
  return Math.max(0, Math.floor(Number(raw) || 0))
}

export default function InventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [filtered, setFiltered] = useState<InventoryProduct[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  // Per-product local size edits: { [productId]: { [size]: qty } }
  const [edits, setEdits] = useState<Record<number, Record<string, number>>>({})
  const [savingId, setSavingId] = useState<number | null>(null)

  // Adding size state per product
  const [addingSizeForId, setAddingSizeForId] = useState<number | null>(null)
  const [newSizeInput, setNewSizeInput] = useState('')

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const url = search.trim()
        ? `/api/admin/inventory?search=${encodeURIComponent(search.trim())}&limit=100`
        : `/api/admin/inventory?limit=100`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      const list: InventoryProduct[] = data?.products ?? []

      setProducts(list)
      setLastRefreshed(new Date())

      // Populate initial size stock map from DB for unedited products
      setEdits(prev => {
        const next = { ...prev }
        list.forEach(p => {
          const dbSizeStock = (p.size_stock && typeof p.size_stock === 'object') ? p.size_stock : {}
          if (!next[p.id]) {
            const itemMap: Record<string, number> = {}
            const sizes = p.sizes && p.sizes.length > 0 ? p.sizes : Object.keys(dbSizeStock)
            // If no sizes configured at all, fallback to standard S, M, L, XL, XXL
            const finalSizes = sizes.length > 0 ? sizes : ['S', 'M', 'L', 'XL', 'XXL']
            finalSizes.forEach(s => {
              itemMap[s] = parseSafeQty(dbSizeStock[s] ?? 0)
            })
            next[p.id] = itemMap
          }
        })
        return next
      })
    } catch (err) {
      if (!silent) toast.error('Failed to load inventory data')
      console.error('[inventory] load error:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const handleRealtimeUpdate = () => {
      load(true)
    }

    window.addEventListener('zyrocore-realtime-update', handleRealtimeUpdate)

    return () => {
      window.removeEventListener('zyrocore-realtime-update', handleRealtimeUpdate)
    }
  }, [load])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      q
        ? products.filter(
            p =>
              p.name.toLowerCase().includes(q) ||
              (p.category_name || '').toLowerCase().includes(q)
          )
        : products
    )
  }, [search, products])

  const lowStockCount = products.filter(p => p.stock <= 10).length

  // Quantity change handler for individual size
  const handleQuantityChange = (productId: number, size: string, rawValue: string | number) => {
    const qty = parseSafeQty(rawValue)
    setEdits(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [size]: qty,
      },
    }))
  }

  // Check if a product has unsaved size edits
  const getIsModified = (product: InventoryProduct) => {
    const dbSizeStock = product.size_stock || {}
    const currentEdits = edits[product.id] || {}
    const sizes = Object.keys(currentEdits)
    if (sizes.length === 0) return false
    return sizes.some(s => parseSafeQty(currentEdits[s] ?? 0) !== parseSafeQty(dbSizeStock[s] ?? 0))
  }

  // Save updated size stock to database & auto-calculate overall total
  const handleSaveSizeStock = async (product: InventoryProduct) => {
    setSavingId(product.id)
    const updatedSizeStock = edits[product.id] || {}

    const cleanedSizeStock: Record<string, number> = {}
    for (const [size, qty] of Object.entries(updatedSizeStock)) {
      cleanedSizeStock[size] = parseSafeQty(qty)
    }

    try {
      const res = await fetch(`/api/admin/products/${product.id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size_stock: cleanedSizeStock }),
      })

      const json = await res.json().catch(() => ({}))

      if (res.ok && json.success) {
        const computedOverallStock = Object.values(cleanedSizeStock).reduce(
          (acc, curr) => acc + Math.max(0, Number(curr) || 0),
          0
        )
        toast.success(`Stock updated for "${product.name}" — Auto-Calculated Total: ${computedOverallStock} units`)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('zyrocore-realtime-update'))
        }
        await load(true)
      } else {
        toast.error(json.error || 'Failed to update size stock')
      }
    } catch {
      toast.error('Network error — could not save inventory')
    } finally {
      setSavingId(null)
    }
  }

  // Reset edits for a product back to DB values
  const handleReset = (product: InventoryProduct) => {
    const dbSizeStock = product.size_stock || {}
    const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : Object.keys(dbSizeStock)
    const finalSizes = sizes.length > 0 ? sizes : ['S', 'M', 'L', 'XL', 'XXL']
    const dbMap: Record<string, number> = {}
    finalSizes.forEach(s => { dbMap[s] = parseSafeQty(dbSizeStock[s] ?? 0) })
    setEdits(prev => ({ ...prev, [product.id]: dbMap }))
  }

  // Add a size to a product in local edit state
  const handleAddSize = (product: InventoryProduct) => {
    const size = newSizeInput.trim().toUpperCase()
    if (!size) return
    const currentProductEdits = edits[product.id] || {}
    if (Object.keys(currentProductEdits).includes(size)) {
      toast.error(`Size "${size}" is already configured`)
      return
    }
    setEdits(prev => ({
      ...prev,
      [product.id]: {
        ...(prev[product.id] || {}),
        [size]: 0,
      },
    }))
    setNewSizeInput('')
    setAddingSizeForId(null)
    toast.info(`Size "${size}" added. Set quantity and click Save.`)
  }

  // Remove a size from a product
  const handleRemoveSize = (product: InventoryProduct, size: string) => {
    setEdits(prev => {
      const next = { ...prev }
      const productEdits = { ...(next[product.id] || {}) }
      delete productEdits[size]
      next[product.id] = productEdits
      return next
    })
  }

  return (
    <AdminShell>
      <div className="p-6 space-y-6 max-w-5xl pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-neutral-900 text-2xl font-bold tracking-tight">Size-Level Inventory</h1>
            <p className="text-neutral-500 text-sm mt-0.5">
              Set stock quantity per size. Overall total stock is automatically calculated.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lastRefreshed && (
              <span className="text-[11px] text-neutral-400 hidden sm:block font-mono">
                Refreshed {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={() => load(false)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 text-neutral-600 text-xs font-semibold hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Low-stock alert banner */}
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
          <div className="py-20 text-center text-neutral-400 text-sm font-medium">
            Loading real-time size inventory...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center bg-white border border-neutral-200 rounded-2xl">
            <Package className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm font-medium">
              {search ? 'No products found matching your search' : 'No products in inventory'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(p => {
              const currentEdits = edits[p.id] || {}
              const sizes = Object.keys(currentEdits).length > 0
                ? Object.keys(currentEdits)
                : (p.sizes && p.sizes.length > 0 ? p.sizes : ['S', 'M', 'L', 'XL', 'XXL'])

              // Auto-calculated overall stock = sum of size stock quantities
              const computedOverallStock = sizes.reduce(
                (acc, s) => acc + parseSafeQty(currentEdits[s] ?? p.size_stock?.[s] ?? 0),
                0
              )

              const level = STOCK_LEVEL(computedOverallStock)
              const isModified = getIsModified(p)

              return (
                <div key={p.id} className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4">
                  {/* Product Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <Image src={p.images[0]} alt={p.name} width={40} height={40} unoptimized className="w-10 h-10 rounded-xl object-cover bg-neutral-100 border border-neutral-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center border border-neutral-200">
                          <Package className="w-5 h-5 text-neutral-400" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-neutral-900 text-base">{p.name}</h3>
                          <span className="text-[10px] font-mono font-bold bg-neutral-100 border border-neutral-200 text-neutral-700 px-2 py-0.5 rounded-md">
                            Product #{p.id}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500">{p.category_name || 'Uncategorized'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isModified && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                          Unsaved changes
                        </span>
                      )}
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${level.cls}`}>
                        {level.label}
                      </span>
                      <div className="bg-neutral-900 border border-neutral-800 text-white px-3 py-1 rounded-xl text-xs font-semibold">
                        Auto Total: <span className="font-mono font-extrabold text-white text-sm">{computedOverallStock}</span>
                      </div>
                    </div>
                  </div>

                  {/* Size Stock Management Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-neutral-400" /> Size Stock Quantities
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingSizeForId(p.id)
                          setNewSizeInput('')
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-neutral-600 hover:text-black px-2.5 py-1 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add Size
                      </button>
                    </div>

                    {/* Add Size Bar */}
                    {addingSizeForId === p.id && (
                      <div className="flex items-center gap-2 p-2 bg-neutral-50 rounded-xl border border-neutral-200">
                        <input
                          autoFocus
                          value={newSizeInput}
                          onChange={e => setNewSizeInput(e.target.value.toUpperCase())}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); handleAddSize(p) }
                            if (e.key === 'Escape') setAddingSizeForId(null)
                          }}
                          placeholder="Size (e.g. XL, XXL, 32)"
                          className="flex-1 bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-black transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddSize(p)}
                          className="px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingSizeForId(null)}
                          className="px-3 py-1.5 border border-neutral-200 text-neutral-600 text-xs font-semibold rounded-lg hover:bg-neutral-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Per-Size Stock Control Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {sizes.map((size: string) => {
                        const qty = parseSafeQty(currentEdits[size] ?? p.size_stock?.[size] ?? 0)
                        const dbQty = parseSafeQty(p.size_stock?.[size] ?? 0)
                        const sizeModified = qty !== dbQty

                        return (
                          <div
                            key={size}
                            className={`p-3 rounded-xl border space-y-2 transition-colors ${
                              sizeModified
                                ? 'bg-amber-50/60 border-amber-300'
                                : 'bg-neutral-50 border-neutral-200/80'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-200 shadow-2xs">
                                {size}
                              </span>
                              <div className="flex items-center gap-1">
                                {sizeModified && (
                                  <span className="text-[9px] font-bold text-amber-600">
                                    was {dbQty}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSize(p, size)}
                                  className="w-4 h-4 flex items-center justify-center text-neutral-300 hover:text-red-500 transition-colors"
                                  title={`Remove size ${size}`}
                                >
                                  <span className="text-[10px] font-bold">✕</span>
                                </button>
                              </div>
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
                                onChange={e => handleQuantityChange(p.id, size, e.target.value)}
                                className={`w-full bg-white border rounded-lg py-1 px-1 text-center font-mono font-bold text-neutral-900 text-sm focus:outline-none focus:border-black transition-colors ${
                                  sizeModified ? 'border-amber-300' : 'border-neutral-200'
                                }`}
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

                            <div className={`text-center text-[10px] font-medium px-1 py-0.5 rounded ${
                              qty === 0
                                ? 'text-red-700 bg-red-50'
                                : qty <= 5
                                ? 'text-amber-700 bg-amber-50'
                                : 'text-emerald-700 bg-emerald-50'
                            }`}>
                              {qty === 0 ? 'Out of Stock' : `${qty} available`}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Save / Reset Actions */}
                  {isModified && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                      <button
                        type="button"
                        onClick={() => handleReset(p)}
                        className="px-3 py-1.5 rounded-xl border border-neutral-200 text-neutral-600 text-xs font-semibold hover:bg-neutral-50 transition-colors flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveSizeStock(p)}
                        disabled={savingId === p.id}
                        className="px-4 py-1.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        {savingId === p.id ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" /> Save Size Stock
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Saved Status Indicator */}
                  {!isModified && computedOverallStock > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Size stock saved. Auto-calculated total: {computedOverallStock} units
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
