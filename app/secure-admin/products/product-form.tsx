'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import AdminShell from '../admin-shell'
import { ArrowLeft, Plus, X, ChevronLeft, ChevronRight, ListPlus, Crop, UploadCloud, Eye, Sparkles, Wand2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { compressImageFile } from '@/lib/image-compress'
import { safeParseJson } from '@/lib/utils-shop'
import ImageCropModal from '@/components/admin/image-crop-modal'

interface ProductFormProps {
  productId?: number
}

interface CustomDetail {
  key: string
  value: string
}

interface StagedImageItem {
  id: string
  file: File
  previewUrl: string
  fileName: string
  isCropped?: boolean
}

export default function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter()
  const isEdit = !!productId

  const [categories, setCategories] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [stockLoaded, setStockLoaded] = useState(!isEdit)

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    discount_price: '',
    category_id: '',
    stock: isEdit ? '' : '50',
    images: [] as string[],
    sizes: isEdit ? [] : ['S', 'M', 'L', 'XL', 'XXL'],
    is_featured: false,
    is_best_seller: false,
    show_on_home: false,
  })

  const [sizeStock, setSizeStock] = useState<Record<string, number>>(
    isEdit ? {} : { S: 10, M: 10, L: 10, XL: 10, XXL: 10 }
  )

  const [stagedImages, setStagedImages] = useState<StagedImageItem[]>([])
  const [cropModal, setCropModal] = useState<{
    isOpen: boolean
    imageSrc: string
    fileName: string
    index: number
    isExisting: boolean
  }>({
    isOpen: false,
    imageSrc: '',
    fileName: '',
    index: -1,
    isExisting: false,
  })

  // Open Details & Specifications list (Key-Value pairs)
  const [customDetails, setCustomDetails] = useState<CustomDetail[]>([])
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const [sizeInput, setSizeInput] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))

  const handleGenerateGeminiAi = async () => {
    if (!form.name.trim()) {
      toast.error('Please enter a Product Name first to generate with Gemini AI!')
      return
    }
    setGeneratingAi(true)
    const toastId = toast.loading('Gemini AI is generating description & specifications...')
    try {
      const selectedCat = categories.find(c => String(c.id) === form.category_id)?.name
      const res = await fetch('/api/admin/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, category: selectedCat }),
      })
      const data = await res.json()
      if (res.ok && data) {
        if (data.description) {
          set('description', data.description)
        }
        if (data.product_details && typeof data.product_details === 'object') {
          const newSpecs: CustomDetail[] = Object.entries(data.product_details).map(([k, v]) => ({
            key: k,
            value: String(v),
          }))
          setCustomDetails(newSpecs)
        }
        if (Array.isArray(data.suggested_sizes) && data.suggested_sizes.length > 0) {
          const mergedSizes = Array.from(new Set([...form.sizes, ...data.suggested_sizes]))
          set('sizes', mergedSizes)
          const newStockMap = { ...sizeStock }
          mergedSizes.forEach(s => {
            if (newStockMap[s] === undefined) newStockMap[s] = 10
          })
          setSizeStock(newStockMap)
          const total = Object.values(newStockMap).reduce((a, b) => a + (b || 0), 0)
          set('stock', String(total))
        }
        toast.success('Generated description and specs with Gemini AI!', { id: toastId })
      } else {
        toast.error(data?.error || 'Failed to generate content', { id: toastId })
      }
    } catch {
      toast.error('Error connecting to Gemini AI service', { id: toastId })
    } finally {
      setGeneratingAi(false)
    }
  }

  // Revoke object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      stagedImages.forEach(img => {
        if (img.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(img.previewUrl)
        }
      })
    }
  }, [stagedImages])

  // Select images locally & stage them with preview URLs
  const handleSelectFiles = (files: FileList | File[]) => {
    const fileArr = Array.from(files)
    const totalCurrentCount = form.images.length + stagedImages.length

    if (totalCurrentCount >= 6) {
      toast.error('Maximum limit of 6 images per product reached.')
      return
    }

    const availableSlots = 6 - totalCurrentCount
    if (fileArr.length > availableSlots) {
      toast.error(`You can only add ${availableSlots} more image(s). (Max 6 images total)`)
    }

    const filesToStage = fileArr.slice(0, availableSlots)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif', 'image/svg+xml']
    const allowedExts = /\.(png|jpg|jpeg|webp|avif|svg)$/i

    const newStaged: StagedImageItem[] = []

    for (const f of filesToStage) {
      if (!allowedTypes.includes(f.type.toLowerCase()) && !f.name.match(allowedExts)) {
        toast.error(`File "${f.name}" is not a supported image format (JPG, JPEG, PNG, WEBP, AVIF, SVG).`)
        continue
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`File "${f.name}" exceeds the 5MB max size limit.`)
        continue
      }

      const previewUrl = URL.createObjectURL(f)
      newStaged.push({
        id: `staged-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: f,
        previewUrl,
        fileName: f.name,
      })
    }

    if (newStaged.length > 0) {
      setStagedImages(prev => [...prev, ...newStaged])
      toast.success(`${newStaged.length} image(s) staged. Click Save Product to upload.`)
    }
  }

  const removeStagedImage = (index: number) => {
    setStagedImages(prev => {
      const target = prev[index]
      if (target && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl)
      }
      const updated = [...prev]
      updated.splice(index, 1)
      return updated
    })
  }

  const removeExistingImage = (index: number) => {
    const updated = [...form.images]
    updated.splice(index, 1)
    set('images', updated)
  }

  // Open Crop Modal for staged file or existing image
  const openCropModal = (index: number, isExisting: boolean) => {
    if (isExisting) {
      const src = form.images[index]
      setCropModal({
        isOpen: true,
        imageSrc: src,
        fileName: `Product Image #${index + 1}`,
        index,
        isExisting: true,
      })
    } else {
      const item = stagedImages[index]
      if (item) {
        setCropModal({
          isOpen: true,
          imageSrc: item.previewUrl,
          fileName: item.fileName,
          index,
          isExisting: false,
        })
      }
    }
  }

  // Handle crop completion
  const handleCropComplete = (croppedBlob: Blob, croppedUrl: string) => {
    const { index, isExisting, fileName } = cropModal

    if (isExisting) {
      // Convert existing remote image into a newly cropped staged file
      const newFile = new File([croppedBlob], `cropped-${Date.now()}.webp`, { type: 'image/webp' })
      removeExistingImage(index)
      setStagedImages(prev => [
        ...prev,
        {
          id: `cropped-${Date.now()}`,
          file: newFile,
          previewUrl: croppedUrl,
          fileName: newFile.name,
          isCropped: true,
        },
      ])
      toast.success('Image cropped! It will be saved when you update the product.')
    } else {
      // Update staged image item
      setStagedImages(prev => {
        const updated = [...prev]
        const target = updated[index]
        if (target) {
          if (target.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(target.previewUrl)
          }
          const newFile = new File([croppedBlob], fileName || target.fileName, { type: 'image/webp' })
          updated[index] = {
            ...target,
            file: newFile,
            previewUrl: croppedUrl,
            isCropped: true,
          }
        }
        return updated
      })
      toast.success('Cropped image applied to staged preview.')
    }
  }

  useEffect(() => {
    fetch('/api/categories').then(r => r.ok ? r.json() : null).then(data => {
      setCategories(data?.categories ?? [])
    })
  }, [])

  useEffect(() => {
    if (!productId) return

    const loadProductData = () => {
      fetch(`/api/products/${productId}`).then(r => r.ok ? r.json() : null).then(data => {
        const p = data?.product
        if (p) {
          const dbSizeStock = (p.size_stock && typeof p.size_stock === 'object') ? p.size_stock : {}
          const dbSizes = (Array.isArray(p.sizes) && p.sizes.length > 0)
            ? Array.from(new Set([...p.sizes, ...Object.keys(dbSizeStock)]))
            : Object.keys(dbSizeStock)

          const initialSizeStock: Record<string, number> = {}
          dbSizes.forEach((s: string) => {
            initialSizeStock[s] = Math.max(0, Math.floor(Number(dbSizeStock[s]) || 0))
          })

          setForm(prev => ({
            ...prev,
            name: prev.name || p.name,
            description: prev.description || p.description || '',
            price: prev.price || String(p.price),
            discount_price: prev.discount_price || (p.discount_price ? String(p.discount_price) : ''),
            category_id: prev.category_id || (p.category_id ? String(p.category_id) : ''),
            stock: String(p.stock),
            images: prev.images.length > 0 ? prev.images : (p.images || []),
            sizes: dbSizes,
            is_featured: prev.is_featured ?? p.is_featured,
            is_best_seller: prev.is_best_seller ?? p.is_best_seller,
            show_on_home: prev.show_on_home ?? (p.show_on_home ?? false),
          }))
          setSizeStock(initialSizeStock)
          setStockLoaded(true)

          if (p.product_details && typeof p.product_details === 'object') {
            const customs: CustomDetail[] = Object.entries(p.product_details).map(([k, v]) => ({
              key: k,
              value: typeof v === 'object' ? JSON.stringify(v) : String(v),
            }))
            setCustomDetails(prev => prev.length > 0 ? prev : customs)
          }
        }
      }).finally(() => setLoading(false))
    }

    loadProductData()

    const handleRealtimeUpdate = () => {
      loadProductData()
    }

    window.addEventListener('zyrocore-realtime-update', handleRealtimeUpdate)
    const interval = setInterval(loadProductData, 4000)

    return () => {
      window.removeEventListener('zyrocore-realtime-update', handleRealtimeUpdate)
      clearInterval(interval)
    }
  }, [productId])

  const addSize = () => {
    const s = sizeInput.trim().toUpperCase()
    if (s && !form.sizes.includes(s)) {
      const newSizes = [...form.sizes, s]
      set('sizes', newSizes)
      const newStock = { ...sizeStock, [s]: sizeStock[s] ?? 10 }
      setSizeStock(newStock)

      // Auto-calculate total stock
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

    // Auto-calculate total stock
    const total = Object.values(newStock).reduce((acc, curr) => acc + (curr || 0), 0)
    set('stock', String(total))
  }

  const handleSizeStockChange = (size: string, rawValue: string | number) => {
    // Use Number() not parseInt() — Number('') = 0 (safe), parseInt('') = NaN (causes 0 bug)
    // Math.floor ensures integer, Math.max(0) prevents negatives
    const validQty = Math.max(0, Math.floor(Number(rawValue) || 0))
    const newStock = { ...sizeStock, [size]: validQty }
    setSizeStock(newStock)

    // Auto-calculate total stock
    const total = Object.values(newStock).reduce((acc, curr) => acc + Math.max(0, Number(curr) || 0), 0)
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

    // Guard: don't allow submission in edit mode if stock hasn't loaded from DB yet
    if (isEdit && !stockLoaded) {
      toast.error('Product data is still loading. Please wait a moment and try again.')
      return
    }

    setSaving(true)

    // Step 1: Upload staged images to server now
    const newlyUploadedUrls: string[] = []
    if (stagedImages.length > 0) {
      for (const item of stagedImages) {
        const toastId = toast.loading(`Uploading ${item.fileName}...`)
        try {
          const fileToUpload = await compressImageFile(item.file, 2000, 0.85)
          const fd = new FormData()
          fd.append('file', fileToUpload)

          const res = await fetch('/api/admin/upload', {
            method: 'POST',
            credentials: 'same-origin',
            body: fd,
          })

          const data = await safeParseJson(res)
          if (res.ok && data?.url) {
            newlyUploadedUrls.push(data.url)
            toast.success(`${item.fileName} uploaded successfully`, { id: toastId })
          } else {
            toast.error(data?.error || `Failed to upload ${item.fileName}`, { id: toastId })
            setSaving(false)
            return
          }
        } catch (err) {
          console.error('Upload error:', err)
          toast.error(`Error uploading ${item.fileName}`, { id: toastId })
          setSaving(false)
          return
        }
      }
    }

    const finalImageUrls = [...form.images, ...newlyUploadedUrls].slice(0, 6)

    // Compile product details object from open specifications
    const finalDetails: Record<string, string> = {}
    customDetails.forEach(cd => {
      if (cd.key && cd.key.trim() && cd.value && cd.value.trim()) {
        finalDetails[cd.key.trim()] = cd.value.trim()
      }
    })

    // Compute exact overall stock from sizeStock
    const computedTotalStock = Object.values(sizeStock).reduce((acc, curr) => acc + Math.max(0, Number(curr) || 0), 0)

    const payload = {
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      discount_price: form.discount_price ? parseFloat(form.discount_price) : null,
      category_id: form.category_id ? parseInt(form.category_id) : null,
      stock: computedTotalStock,
      images: finalImageUrls,
      sizes: form.sizes,
      product_details: finalDetails,
      size_stock: sizeStock,
      is_featured: form.is_featured,
      is_best_seller: form.is_best_seller,
      show_on_home: form.show_on_home,
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    try {
      const res = isEdit
        ? await fetch(`/api/admin/products/${productId}`, { method: 'PUT', headers, credentials: 'include', body: JSON.stringify(payload) })
        : await fetch('/api/admin/products', { method: 'POST', headers, credentials: 'include', body: JSON.stringify(payload) })

      if (res.ok) {
        toast.success(isEdit ? 'Product updated successfully' : 'Product created successfully')
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('zyrocore-realtime-update'))
        }
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

  const totalImageCount = form.images.length + stagedImages.length

  return (
    <AdminShell>
      <div className="p-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/secure-admin/products" className="text-neutral-400 hover:text-black transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-neutral-900 text-2xl font-bold tracking-tight">{isEdit ? `Edit Product` : 'Add New Product'}</h1>
              {isEdit && productId && (
                <span className="text-xs font-mono font-bold bg-neutral-100 border border-neutral-200 text-neutral-800 px-2.5 py-1 rounded-lg">
                  Product #{productId}
                </span>
              )}
            </div>
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

          {/* Pricing & Overall Inventory */}
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
                  value={Object.values(sizeStock).reduce((acc, curr) => acc + Math.max(0, Number(curr) || 0), 0)}
                  readOnly
                  disabled
                  placeholder="0"
                  suppressHydrationWarning
                  className={inputCls + ' bg-neutral-100 font-mono font-bold text-neutral-900 cursor-not-allowed'}
                />
              </div>
            </div>
          </div>

          {/* Product Media & Image Crop/Preview */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-neutral-900 text-sm font-bold">Product Media & Previews</h2>
                <p className="text-neutral-400 text-xs mt-0.5">Select, preview, crop, and stage product images before saving.</p>
              </div>
              <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-full border border-neutral-200">
                {totalImageCount} / 6 images
              </span>
            </div>

            {totalImageCount < 6 && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleSelectFiles(e.dataTransfer.files) }}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    document.getElementById('img-file-input')?.click()
                  }
                }}
                className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer ${
                  dragOver ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'
                }`}
                onClick={() => document.getElementById('img-file-input')?.click()}
              >
                <input
                  id="img-file-input"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.avif,.svg,image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
                  multiple
                  className="hidden"
                  onChange={e => { if (e.target.files?.length) { handleSelectFiles(e.target.files); e.target.value = '' } }}
                />
                <div className="flex flex-col items-center justify-center py-8 gap-2 select-none pointer-events-none">
                  <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4-4a3 3 0 014.24 0L16 16m-2-2l1.59-1.59a3 3 0 014.24 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-neutral-500 text-sm">
                    <span className="text-black font-semibold underline">Click to select images</span> or drag & drop
                  </p>
                  <p className="text-neutral-400 text-xs">JPG, JPEG, PNG, WEBP, AVIF, SVG supported • Max 5MB per file</p>
                </div>
              </div>
            )}

            {/* Staged & Existing Previews Grid */}
            {totalImageCount > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Image Previews ({totalImageCount})</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {/* Render Existing Uploaded Images */}
                  {form.images.map((url, idx) => (
                    <div key={`existing-${idx}`} className="relative group aspect-square rounded-xl border border-neutral-200 bg-neutral-50 overflow-hidden shadow-sm flex flex-col">
                      <Image src={url} alt={`Product ${idx + 1}`} fill sizes="120px" unoptimized className="object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1.5 left-1.5 bg-black text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow z-10">MAIN</span>
                      )}

                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 z-20">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeExistingImage(idx)}
                            className="p-1 bg-red-600 hover:bg-red-500 text-white rounded-full transition-colors"
                            title="Remove image"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => openCropModal(idx, true)}
                            className="px-2.5 py-1 bg-white/90 hover:bg-white text-neutral-900 rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow transition-colors"
                          >
                            <Crop className="w-3 h-3" /> Crop
                          </button>
                        </div>

                        <div className="text-[10px] text-white/80 truncate text-center font-medium">Uploaded</div>
                      </div>
                    </div>
                  ))}

                  {/* Render Staged Local Images */}
                  {stagedImages.map((staged, idx) => (
                    <div key={staged.id} className="relative group aspect-square rounded-xl border-2 border-emerald-500/80 bg-neutral-50 overflow-hidden shadow-sm flex flex-col">
                      <Image src={staged.previewUrl} alt={staged.fileName} fill sizes="120px" unoptimized className="object-cover" />
                      <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow z-10">
                        {staged.isCropped ? 'CROPPED' : 'STAGED'}
                      </span>

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 z-20">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeStagedImage(idx)}
                            className="p-1 bg-red-600 hover:bg-red-500 text-white rounded-full transition-colors"
                            title="Remove staged image"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => openCropModal(idx, false)}
                            className="px-2 py-1 bg-white hover:bg-neutral-100 text-neutral-900 rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow transition-colors"
                          >
                            <Crop className="w-3 h-3" /> Crop
                          </button>
                        </div>

                        <div className="text-[10px] text-white truncate text-center font-medium px-1" title={staged.fileName}>
                          {staged.fileName}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Product Details & Specifications — Open Freeform & Gemini AI Powered */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
              <div>
                <h2 className="text-neutral-900 text-sm font-bold flex items-center gap-2">
                  <span>Product Details & Specifications</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                    Freeform & AI Powered
                  </span>
                </h2>
                <p className="text-neutral-400 text-xs mt-0.5">Fill in whatever specifications you need — keep as open text or key-value pairs.</p>
              </div>

              <button
                type="button"
                onClick={handleGenerateGeminiAi}
                disabled={generatingAi}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-black hover:from-purple-700 hover:to-neutral-900 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${generatingAi ? 'animate-spin' : ''}`} />
                {generatingAi ? 'Gemini AI Generating...' : 'Auto-Fill with Gemini AI'}
              </button>
            </div>

            {/* Quick Add Specification Suggestions */}
            <div className="space-y-1.5">
              <label className={labelCls}>Quick Add Common Specifications</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Material', 'Fabric', 'GSM', 'Fit', 'Sleeve Type',
                  'Neck Type', 'Pattern', 'Care Instructions', 'Country of Origin', 'Warranty'
                ].map(specKey => (
                  <button
                    key={specKey}
                    type="button"
                    onClick={() => {
                      if (!customDetails.some(cd => cd.key.toLowerCase() === specKey.toLowerCase())) {
                        setCustomDetails(prev => [...prev, { key: specKey, value: '' }])
                      }
                    }}
                    className="text-[11px] font-semibold text-neutral-600 bg-neutral-50 hover:bg-neutral-100 hover:text-black border border-neutral-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-neutral-400" /> {specKey}
                  </button>
                ))}
              </div>
            </div>

            {/* Open Editable Specifications List */}
            <div className="space-y-3 pt-2">
              <label className={labelCls}>Open Specifications (Key & Value Pairs)</label>

              {customDetails.length === 0 ? (
                <div className="p-4 border border-dashed border-neutral-200 rounded-xl text-center space-y-2 bg-neutral-50/50">
                  <p className="text-xs text-neutral-500 font-medium">No custom specifications added yet.</p>
                  <p className="text-[11px] text-neutral-400">Click &ldquo;Auto-Fill with Gemini AI&rdquo; or add any key-value pair below.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customDetails.map((cd, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-neutral-50 border border-neutral-200/90 shadow-2xs">
                      <input
                        value={cd.key}
                        onChange={e => {
                          const val = e.target.value
                          setCustomDetails(prev => {
                            const updated = [...prev]
                            updated[idx] = { ...updated[idx], key: val }
                            return updated
                          })
                        }}
                        placeholder="Feature Name (e.g. Material)"
                        className="w-1/3 min-w-[120px] bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none focus:border-black transition-colors"
                      />
                      <input
                        value={cd.value}
                        onChange={e => {
                          const val = e.target.value
                          setCustomDetails(prev => {
                            const updated = [...prev]
                            updated[idx] = { ...updated[idx], value: val }
                            return updated
                          })
                        }}
                        placeholder="Detail (e.g. 100% French Terry Cotton)"
                        className="flex-1 bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-black transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomDetail(idx)}
                        className="p-1.5 text-neutral-300 hover:text-red-600 rounded-lg hover:bg-neutral-100 transition-colors"
                        title="Delete specification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Specification Input Bar */}
              <div className="flex gap-2 pt-2 border-t border-neutral-100">
                <input
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  placeholder="New Spec Name (e.g. Fit)"
                  className="w-1/3 min-w-[120px] bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-black transition-colors"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomDetail())}
                />
                <input
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  placeholder="New Spec Detail (e.g. Oversized Drop Shoulder)"
                  className="flex-1 bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-black transition-colors"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomDetail())}
                />
                <button
                  type="button"
                  onClick={addCustomDetail}
                  className="bg-black hover:bg-neutral-800 text-white px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Size-Based Stock Management */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-sm">
            <div>
              <h2 className="text-neutral-900 text-sm font-bold">Size-Based Inventory Management</h2>
              <p className="text-neutral-400 text-xs mt-0.5">Specify independent stock quantities per size. Overall total stock is calculated automatically.</p>
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
                            onChange={e => handleSizeStockChange(s, e.target.value)}
                            className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-neutral-900 text-sm font-semibold focus:outline-none focus:border-black transition-colors"
                          />
                        </div>
                        <div className="col-span-4 text-right">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                            isOut ? 'text-red-700 bg-red-50 border border-red-200' :
                            isLow ? 'text-amber-700 bg-amber-50 border border-amber-200' :
                            'text-emerald-700 bg-emerald-50 border border-emerald-200'
                          }`}>
                            {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="text-neutral-400 text-xs italic">No sizes added yet.</p>
            )}
          </div>

          {/* Labels */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3 shadow-sm">
            <h2 className="text-neutral-900 text-sm font-bold">Labels & Flags</h2>
            <div className="flex gap-6">
              {[
                { key: 'is_featured', label: 'Featured Product' },
                { key: 'is_best_seller', label: 'Best Seller' },
                { key: 'show_on_home', label: 'Show on Home' },
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
              className="bg-black hover:bg-neutral-900 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              {saving ? 'Uploading & Saving Product...' : isEdit ? 'Update Product' : 'Add Product'}
            </button>
            <Link href="/secure-admin/products" className="text-neutral-500 hover:text-black text-sm font-semibold transition-colors">
              Cancel
            </Link>
          </div>
        </form>

        {/* Crop Modal Component */}
        <ImageCropModal
          isOpen={cropModal.isOpen}
          imageSrc={cropModal.imageSrc}
          fileName={cropModal.fileName}
          onClose={() => setCropModal(c => ({ ...c, isOpen: false }))}
          onCropComplete={handleCropComplete}
        />
      </div>
    </AdminShell>
  )
}
