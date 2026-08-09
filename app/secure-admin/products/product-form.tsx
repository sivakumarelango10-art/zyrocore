'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminShell from '../admin-shell'
import { ArrowLeft, Plus, X, ChevronLeft, ChevronRight, AlertTriangle, ListPlus } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { compressImageFile } from '@/lib/image-compress'
import { safeParseJson } from '@/lib/utils-shop'

interface ProductFormProps {
  productId?: number
}

interface CustomDetail {
  key: string
  value: string
}

export default function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter()
  const isEdit = !!productId

  const [categories, setCategories] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    discount_price: '',
    category_id: '',
    stock: isEdit ? '' : '0',
    images: [] as string[],
    sizes: isEdit ? [] : ['S', 'M', 'L', 'XL', 'XXL'],
    is_featured: false,
    is_best_seller: false,
  })

  const [sizeStock, setSizeStock] = useState<Record<string, number>>(
    isEdit ? {} : { S: 0, M: 0, L: 0, XL: 0, XXL: 0 }
  )

  // Product Details (Structured + Custom)
  const [details, setDetails] = useState({
    material: '',
    fabric: '',
    gsm: '',
    fit: '',
    sleeve_type: '',
    neck_type: '',
    pattern: '',
    origin: '',
    manufacturer: '',
    care: '',
    wash: '',
    warranty: '',
  })
  const [customDetails, setCustomDetails] = useState<CustomDetail[]>([])
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const [sizeInput, setSizeInput] = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files)
    
    // Validate current image limit (max 6)
    if (form.images.length >= 6) {
      toast.error('Maximum limit of 6 images per product reached.')
      return
    }

    const availableSlots = 6 - form.images.length
    if (fileArr.length > availableSlots) {
      toast.error(`You can only add ${availableSlots} more image(s). (Max 6 images per product)`)
    }

    const filesToUpload = fileArr.slice(0, availableSlots)
    
    // Allowed formats: JPG, JPEG, PNG, WEBP, AVIF, SVG
    const allowedTypes = [
      'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif', 'image/svg+xml'
    ]
    const allowedExts = /\.(png|jpg|jpeg|webp|avif|svg)$/i

    const validFiles: File[] = []

    for (const f of filesToUpload) {
      if (!allowedTypes.includes(f.type.toLowerCase()) && !f.name.match(allowedExts)) {
        toast.error(`File "${f.name}" is not a supported image format (JPG, JPEG, PNG, WEBP, AVIF, SVG).`)
        continue
      }
      if (f.size > 50 * 1024 * 1024) {
        toast.error(`File "${f.name}" exceeds the 50MB size limit.`)
        continue
      }
      validFiles.push(f)
    }

    if (validFiles.length === 0) return

    setUploadingImages(true)
    const uploadedUrls: string[] = []

    for (const rawFile of validFiles) {
      const toastId = toast.loading(`Optimizing ${rawFile.name}...`)
      try {
        const fileToUpload = await compressImageFile(rawFile, 2000, 0.85)

        toast.loading(`Uploading ${rawFile.name}...`, { id: toastId })
        const fd = new FormData()
        fd.append('file', fileToUpload)

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          credentials: 'same-origin',
          body: fd,
        })

        const data = await safeParseJson(res)
        if (res.ok && data?.url) {
          uploadedUrls.push(data.url)
          toast.success(`${rawFile.name} uploaded successfully!`, { id: toastId })
        } else {
          toast.error(data?.error || `Failed to upload ${rawFile.name}`, { id: toastId })
        }
      } catch (err) {
        console.error('Upload exception:', err)
        toast.error(`Error uploading ${rawFile.name}`, { id: toastId })
      }
    }

    if (uploadedUrls.length > 0) {
      set('images', [...form.images, ...uploadedUrls].slice(0, 6))
    }
    setUploadingImages(false)
  }

  useEffect(() => {
    fetch('/api/categories').then(r => r.ok ? r.json() : null).then(data => {
      setCategories(data?.categories ?? [])
    })
  }, [])

  useEffect(() => {
    if (!productId) return
    fetch(`/api/products/${productId}`).then(r => r.ok ? r.json() : null).then(data => {
      const p = data?.product
      if (p) {
        setForm({
          name: p.name, description: p.description || '',
          price: String(p.price), discount_price: p.discount_price ? String(p.discount_price) : '',
          category_id: p.category_id ? String(p.category_id) : '',
          stock: String(p.stock), images: p.images || [], sizes: p.sizes || [],
          is_featured: p.is_featured, is_best_seller: p.is_best_seller,
        })

        if (p.product_details) {
          const pd = p.product_details
          setDetails({
            material: pd['Material'] || '',
            fabric: pd['Fabric'] || '',
            gsm: pd['GSM'] || '',
            fit: pd['Fit'] || '',
            sleeve_type: pd['Sleeve Type'] || '',
            neck_type: pd['Neck Type'] || '',
            pattern: pd['Pattern'] || '',
            origin: pd['Country of Origin'] || '',
            manufacturer: pd['Manufacturer'] || '',
            care: pd['Care Instructions'] || '',
            wash: pd['Wash Instructions'] || '',
            warranty: pd['Warranty'] || '',
          })

          const knownKeys = ['Material', 'Fabric', 'GSM', 'Fit', 'Sleeve Type', 'Neck Type', 'Pattern', 'Country of Origin', 'Manufacturer', 'Care Instructions', 'Wash Instructions', 'Warranty']
          const customs: CustomDetail[] = []
          Object.entries(pd).forEach(([k, v]) => {
            if (!knownKeys.includes(k) && typeof v === 'string') {
              customs.push({ key: k, value: v })
            }
          })
          setCustomDetails(customs)
        }

        if (p.size_stock) {
          setSizeStock(p.size_stock)
        }
      }
    }).finally(() => setLoading(false))
  }, [productId])

  const removeImage = (index: number) => {
    const updated = [...form.images]
    updated.splice(index, 1)
    set('images', updated)
  }

  const moveImage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= form.images.length) return
    const updated = [...form.images]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    set('images', updated)
  }

  const addSize = () => {
    const s = sizeInput.trim().toUpperCase()
    if (s && !form.sizes.includes(s)) {
      const newSizes = [...form.sizes, s]
      set('sizes', newSizes)
      const newStock = { ...sizeStock, [s]: sizeStock[s] ?? 10 }
      setSizeStock(newStock)
      // Auto-update total stock
      const total = Object.values(newStock).reduce((acc, curr) => acc + (curr || 0), 0)
      set('stock', String(total))
      setSizeInput('')
    }
  }

  const removeSize = (s: string) => {
    const newSizes = form.sizes.filter(x => x !== s)
    set('sizes', newSizes)
    const newStock = { ...sizeStock }
    delete newStock[s]
    setSizeStock(newStock)
    const total = Object.values(newStock).reduce((acc, curr) => acc + (curr || 0), 0)
    set('stock', String(total))
  }

  const handleSizeStockChange = (size: string, qty: number) => {
    const validQty = Math.max(0, qty)
    const newStock = { ...sizeStock, [size]: validQty }
    setSizeStock(newStock)
    const total = Object.values(newStock).reduce((acc, curr) => acc + (curr || 0), 0)
    set('stock', String(total))
  }

  const addCustomDetail = () => {
    const k = newKey.trim()
    const v = newValue.trim()
    if (k && v) {
      setCustomDetails([...customDetails, { key: k, value: v }])
      setNewKey('')
      setNewValue('')
    } else {
      toast.error('Please enter both specification name and value.')
    }
  }

  const removeCustomDetail = (index: number) => {
    const updated = [...customDetails]
    updated.splice(index, 1)
    setCustomDetails(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // Compile product details object
    const finalDetails: Record<string, string> = {}
    if (details.material) finalDetails['Material'] = details.material
    if (details.fabric) finalDetails['Fabric'] = details.fabric
    if (details.gsm) finalDetails['GSM'] = details.gsm
    if (details.fit) finalDetails['Fit'] = details.fit
    if (details.sleeve_type) finalDetails['Sleeve Type'] = details.sleeve_type
    if (details.neck_type) finalDetails['Neck Type'] = details.neck_type
    if (details.pattern) finalDetails['Pattern'] = details.pattern
    if (details.origin) finalDetails['Country of Origin'] = details.origin
    if (details.manufacturer) finalDetails['Manufacturer'] = details.manufacturer
    if (details.care) finalDetails['Care Instructions'] = details.care
    if (details.wash) finalDetails['Wash Instructions'] = details.wash
    if (details.warranty) finalDetails['Warranty'] = details.warranty

    customDetails.forEach(cd => {
      if (cd.key && cd.value) finalDetails[cd.key] = cd.value
    })

    const payload = {
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      discount_price: form.discount_price ? parseFloat(form.discount_price) : null,
      category_id: form.category_id ? parseInt(form.category_id) : null,
      stock: parseInt(form.stock) || 0,
      images: form.images,
      sizes: form.sizes,
      product_details: finalDetails,
      size_stock: sizeStock,
      is_featured: form.is_featured,
      is_best_seller: form.is_best_seller,
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    try {
      const res = isEdit
        ? await fetch(`/api/admin/products/${productId}`, { method: 'PUT', headers, credentials: 'include', body: JSON.stringify(payload) })
        : await fetch('/api/admin/products', { method: 'POST', headers, credentials: 'include', body: JSON.stringify(payload) })

      if (res.ok) {
        toast.success(isEdit ? 'Product updated successfully' : 'Product created successfully')
        router.push('/secure-admin/products')
        router.refresh()
      } else {
        let errText = 'Failed to save product'
        try {
          const d = await res.json()
          if (d?.error) errText = d.error
        } catch {
          errText = `HTTP Error ${res.status}: ${res.statusText || 'Server error'}`
        }
        toast.error(errText)
      }
    } catch (err) {
      console.error('Submit exception:', err)
      const msg = err instanceof Error ? err.message : 'Network connection failure'
      toast.error(`Network Error: ${msg}. Please try again.`)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full bg-white border border-neutral-200 rounded-lg px-3 py-2.5 text-neutral-900 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-black transition-colors"
  const labelCls = "block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5"

  if (loading) return (
    <AdminShell>
      <div className="p-6 text-center text-neutral-400 text-sm font-medium">Loading product...</div>
    </AdminShell>
  )

  return (
    <AdminShell>
      <div className="p-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/secure-admin/products" className="text-neutral-400 hover:text-black transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-neutral-900 text-2xl font-bold tracking-tight">{isEdit ? 'Edit Product' : 'Add New Product'}</h1>
            <p className="text-neutral-500 text-sm">{isEdit ? 'Update product details, stock, and specifications' : 'Fill in the details below to list a new product'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-sm">
            <h2 className="text-neutral-900 text-sm font-bold">Basic Information</h2>
            <div>
              <label className={labelCls}>Product Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Heavyweight Minimal Oversized Hoodie" suppressHydrationWarning className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Description (Main overview)</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Describe the story and overview of the product..." suppressHydrationWarning className={inputCls + ' resize-none'} />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select value={form.category_id} onChange={e => set('category_id', e.target.value)} suppressHydrationWarning className={inputCls}>
                <option value="">Select category</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Pricing & Total Stock */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-sm">
            <h2 className="text-neutral-900 text-sm font-bold">Pricing & Overall Inventory</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Price (₹) *</label>
                <input type="number" value={form.price} onChange={e => set('price', e.target.value)} required min="0" step="0.01" placeholder="1999" suppressHydrationWarning className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Sale Price (₹)</label>
                <input type="number" value={form.discount_price} onChange={e => set('discount_price', e.target.value)} min="0" step="0.01" placeholder="1499" suppressHydrationWarning className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Total Stock (Auto-Calculated)</label>
                <input
                  type="number"
                  value={form.stock || '0'}
                  readOnly
                  disabled
                  placeholder="0"
                  suppressHydrationWarning
                  className={inputCls + ' bg-neutral-100 font-mono font-bold text-neutral-800 cursor-not-allowed'}
                />
              </div>
            </div>
          </div>

          {/* Product Details & Specifications */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-sm">
            <div>
              <h2 className="text-neutral-900 text-sm font-bold">Product Details & Specifications</h2>
              <p className="text-neutral-400 text-xs mt-0.5">Structured technical specs shown separately from the main description.</p>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Material</label>
                <input value={details.material} onChange={e => setDetails(d => ({ ...d, material: e.target.value }))} placeholder="e.g. 100% French Terry Cotton" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Fabric</label>
                <input value={details.fabric} onChange={e => setDetails(d => ({ ...d, fabric: e.target.value }))} placeholder="e.g. Premium Heavyweight" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>GSM</label>
                <input value={details.gsm} onChange={e => setDetails(d => ({ ...d, gsm: e.target.value }))} placeholder="e.g. 340 GSM" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Fit</label>
                <input value={details.fit} onChange={e => setDetails(d => ({ ...d, fit: e.target.value }))} placeholder="e.g. Relaxed Oversized Fit" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Sleeve Type</label>
                <input value={details.sleeve_type} onChange={e => setDetails(d => ({ ...d, sleeve_type: e.target.value }))} placeholder="e.g. Full Sleeve / Drop Shoulder" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Neck Type</label>
                <input value={details.neck_type} onChange={e => setDetails(d => ({ ...d, neck_type: e.target.value }))} placeholder="e.g. Double-Layered Hood" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Pattern</label>
                <input value={details.pattern} onChange={e => setDetails(d => ({ ...d, pattern: e.target.value }))} placeholder="e.g. Tone-on-tone Embroidery" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Country of Origin</label>
                <input value={details.origin} onChange={e => setDetails(d => ({ ...d, origin: e.target.value }))} placeholder="e.g. India (Tamil Nadu)" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Manufacturer</label>
                <input value={details.manufacturer} onChange={e => setDetails(d => ({ ...d, manufacturer: e.target.value }))} placeholder="e.g. ZYRØCORE Apparels" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Care Instructions</label>
                <input value={details.care} onChange={e => setDetails(d => ({ ...d, care: e.target.value }))} placeholder="e.g. Machine wash cold, do not bleach" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Wash Instructions</label>
                <input value={details.wash} onChange={e => setDetails(d => ({ ...d, wash: e.target.value }))} placeholder="e.g. Wash inside out with like colors" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Warranty</label>
                <input value={details.warranty} onChange={e => setDetails(d => ({ ...d, warranty: e.target.value }))} placeholder="e.g. 6 Months Quality Guarantee" className={inputCls} />
              </div>
            </div>

            {/* Custom Key-Value Details Builder */}
            <div className="pt-3 border-t border-neutral-100 space-y-3">
              <label className={labelCls}>Custom Specifications (Key-Value Pairs)</label>
              <div className="flex gap-2">
                <input
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  placeholder="Feature (e.g. Pocket)"
                  className={inputCls + ' flex-1'}
                />
                <input
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  placeholder="Detail (e.g. Double Front Pockets)"
                  className={inputCls + ' flex-1'}
                />
                <button
                  type="button"
                  onClick={addCustomDetail}
                  className="bg-neutral-900 hover:bg-black text-white px-4 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
                >
                  <ListPlus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {customDetails.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-2 pt-1">
                  {customDetails.map((cd, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-200 text-xs">
                      <div>
                        <strong className="text-neutral-900">{cd.key}:</strong>{' '}
                        <span className="text-neutral-600">{cd.value}</span>
                      </div>
                      <button type="button" onClick={() => removeCustomDetail(idx)} className="text-neutral-400 hover:text-red-600 p-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Size-Based Stock Management */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-sm">
            <div>
              <h2 className="text-neutral-900 text-sm font-bold">Size-Based Inventory Management</h2>
              <p className="text-neutral-400 text-xs mt-0.5">Define sizes and specify real-time stock quantities per size.</p>
            </div>

            <div className="flex gap-2">
              <input
                value={sizeInput}
                onChange={e => setSizeInput(e.target.value)}
                placeholder="Add size (e.g. S, M, L, XL, XXL, 32)"
                suppressHydrationWarning
                className={inputCls + ' flex-1'}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSize())}
              />
              <button type="button" onClick={addSize} suppressHydrationWarning className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 rounded-lg px-4 text-xs font-semibold flex items-center gap-1 transition-colors">
                <Plus className="w-4 h-4" /> Add Size
              </button>
            </div>

            {form.sizes.length > 0 ? (
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider px-2">
                  <div className="col-span-3">Size</div>
                  <div className="col-span-5">Stock Quantity</div>
                  <div className="col-span-4 text-right">Status</div>
                </div>
                <div className="space-y-2">
                  {form.sizes.map(s => {
                    const currentQty = sizeStock[s] ?? 0
                    const isLow = currentQty <= 5 && currentQty > 0
                    const isOut = currentQty === 0

                    return (
                      <div key={s} className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-lg border border-neutral-200 bg-neutral-50/60">
                        <div className="col-span-3 flex items-center gap-1.5">
                          <span className="font-bold text-neutral-900 text-sm bg-white border border-neutral-200 px-2 py-0.5 rounded">{s}</span>
                          <button type="button" onClick={() => removeSize(s)} className="text-neutral-400 hover:text-red-600 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="col-span-5">
                          <input
                            type="number"
                            min="0"
                            value={currentQty}
                            onChange={e => handleSizeStockChange(s, parseInt(e.target.value) || 0)}
                            className="w-full bg-white border border-neutral-200 rounded-md px-2.5 py-1 text-neutral-900 text-sm font-mono focus:outline-none focus:border-black"
                          />
                        </div>
                        <div className="col-span-4 text-right flex items-center justify-end gap-1">
                          {isOut && <span className="text-[10px] font-bold uppercase text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded">Out of Stock</span>}
                          {isLow && <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Low ({currentQty})</span>}
                          {!isOut && !isLow && <span className="text-[10px] font-bold uppercase text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded">In Stock</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 italic">No sizes added yet. Enter sizes above to set per-size inventory.</p>
            )}
          </div>

          {/* Product Images (Max 6) */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-neutral-900 text-sm font-bold">Product Images ({form.images.length}/6)</h2>
              <span className="text-neutral-400 text-xs font-medium">JPG, JPEG, PNG, WEBP, AVIF (Max 6 Images)</span>
            </div>

            {/* Drop zone */}
            {form.images.length < 6 && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files) }}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (!uploadingImages) document.getElementById('img-file-input')?.click()
                  }
                }}
                className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer ${
                  dragOver ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'
                }`}
                onClick={() => !uploadingImages && document.getElementById('img-file-input')?.click()}
              >
                <input
                  id="img-file-input"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.avif,.svg,image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
                  multiple
                  className="hidden"
                  onChange={e => { if (e.target.files?.length) { uploadFiles(e.target.files); e.target.value = '' } }}
                />
                <div className="flex flex-col items-center justify-center py-8 gap-2 select-none pointer-events-none">
                  {uploadingImages ? (
                    <>
                      <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <p className="text-neutral-400 text-sm font-medium">Uploading image(s)...</p>
                    </>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4-4a3 3 0 014.24 0L16 16m-2-2l1.59-1.59a3 3 0 014.24 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-neutral-500 text-sm">
                        <span className="text-black font-semibold underline">Click to upload</span> or drag & drop
                      </p>
                      <p className="text-neutral-400 text-xs">JPG, JPEG, PNG, WEBP, AVIF supported • Up to 6 images</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Previews */}
            {form.images.length > 0 && (
              <div className="space-y-2 mt-3">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Image Ordering & Previews</p>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                  {form.images.map((url, idx) => (
                    <div key={url + idx} className="relative group aspect-square rounded-lg border border-neutral-200 bg-neutral-50 overflow-hidden shadow-sm flex flex-col">
                      <img
                        src={url}
                        alt={`Product preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 bg-black text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow">MAIN</span>
                      )}

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        {idx > 0 && (
                          <button
                            type="button"
                            title="Move left"
                            onClick={() => moveImage(idx, 'left')}
                            className="w-6 h-6 bg-white/90 hover:bg-white text-black rounded-full flex items-center justify-center shadow transition-colors"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {idx < form.images.length - 1 && (
                          <button
                            type="button"
                            title="Move right"
                            onClick={() => moveImage(idx, 'right')}
                            className="w-6 h-6 bg-white/90 hover:bg-white text-black rounded-full flex items-center justify-center shadow transition-colors"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Remove image"
                          aria-label={`Remove image ${idx + 1}`}
                          onClick={() => removeImage(idx)}
                          className="w-6 h-6 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Labels */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3 shadow-sm">
            <h2 className="text-neutral-900 text-sm font-bold">Labels & Flags</h2>
            <div className="flex gap-6">
              {[
                { key: 'is_featured', label: 'Featured Product' },
                { key: 'is_best_seller', label: 'Best Seller' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(form[key as keyof typeof form])}
                    onChange={() => set(key, !form[key as keyof typeof form])}
                    className="w-4 h-4 rounded border border-neutral-300 accent-black cursor-pointer"
                  />
                  <span className="text-neutral-700 text-sm font-semibold">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              suppressHydrationWarning
              className="bg-black hover:bg-neutral-900 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors shadow-sm"
            >
              {saving ? 'Saving...' : isEdit ? 'Update Product' : 'Add Product'}
            </button>
            <Link href="/secure-admin/products" className="text-neutral-500 hover:text-black text-sm font-semibold transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AdminShell>
  )
}
