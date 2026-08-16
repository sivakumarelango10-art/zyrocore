'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Heart, ShoppingCart, Star, ChevronRight, Minus, Plus, Check,
  Share2, Copy, Send, MessageCircle, Facebook, Twitter, Mail, Info, ShieldCheck, RefreshCw, Truck,
  MessageSquare, ThumbsUp, Shield, Upload, Trash2, Edit3, Camera, ZoomIn
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import dynamic from 'next/dynamic'
import ProductCard from '@/components/product-card'
import { formatPrice, formatDate, calculateDiscount, safeParseJson } from '@/lib/utils-shop'
import { getAvailableStockForSize } from '@/lib/inventory-utils'

const ProductLightbox = dynamic(() => import('@/components/product-lightbox'), { ssr: false })
import { useAuth } from '@/components/auth-provider'
import { useCart } from '@/components/cart-provider'
import { compressImageFile } from '@/lib/image-compress'
import { SITE_CONFIG } from '@/lib/site-config'
import { toast } from 'sonner'
import type { Product } from '@/lib/types'

interface Props {
  product: Product
  related: Product[]
}

interface Review {
  id: number
  user_id: number
  user_name: string
  rating: number
  title?: string
  comment?: string
  images?: string[]
  is_verified: boolean
  created_at: string
}

// Constant star indices — avoids allocating a new array on every render
const STAR_INDICES = [0, 1, 2, 3, 4]

const parseProductDetails = (raw: unknown): [string, string][] => {
  if (!raw) return []
  let parsed: any = raw
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed)
      }
    } catch {
      return [['Details', String(raw)]]
    }
  }
  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
    return Object.entries(parsed)
      .filter(([_, val]) => val !== undefined && val !== null && val !== '')
      .map(([key, val]) => [
        key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
        typeof val === 'object' ? JSON.stringify(val) : String(val),
      ])
  }
  return []
}

export default function ProductDetailClient({ product, related }: Props) {
  const { user } = useAuth()
  const { refreshCart } = useCart()
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [adding, setAdding] = useState(false)
  const [buyingNow, setBuyingNow] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)

  // Stable productUrl — avoids SSR/hydration mismatch from reading window on render
  const [productUrl, setProductUrl] = useState('')
  useEffect(() => {
    setProductUrl(window.location.href)
  }, [])

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  // Review states
  const [reviewsData, setReviewsData] = useState<{
    reviews: Review[]
    totalReviews: number
    averageRating: number
    breakdown: Record<number, number>
    userReview: Review | null
  }>({
    reviews: [],
    totalReviews: Number(product.rating_count) || 0,
    averageRating: Number(product.rating) || 0,
    breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    userReview: null,
  })
  const [loadingReviews, setLoadingReviews] = useState(true)

  // Write/Edit review form state
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [reviewImages, setReviewImages] = useState<string[]>([])
  const [submittingReview, setSubmittingReview] = useState(false)
  const [uploadingReviewImg, setUploadingReviewImg] = useState(false)

  const effectivePrice = product.discount_price ?? product.price
  const discount = product.discount_price ? calculateDiscount(product.price, product.discount_price) : 0

  // Memoize parsed product details so it's only recomputed when product_details changes
  const parsedDetails = useMemo(() => parseProductDetails(product.product_details), [product.product_details])

  // Memoized so useEffect deps are stable and it can safely be called from multiple handlers
  const loadReviews = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews?product_id=${product.id}`)
      if (res.ok) {
        const data = await res.json()
        setReviewsData(data)
        if (data.userReview) {
          setReviewRating(data.userReview.rating)
          setReviewTitle(data.userReview.title || '')
          setReviewComment(data.userReview.comment || '')
          setReviewImages(data.userReview.images || [])
        }
      }
    } catch {
      // quiet catch
    } finally {
      setLoadingReviews(false)
    }
  }, [product.id])

  useEffect(() => {
    let cancelled = false
    let idleHandle: number | null = null
    let timeoutHandle: ReturnType<typeof globalThis.setTimeout> | null = null
    const scheduler = globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
      cancelIdleCallback?: (handle: number) => void
    }

    const run = () => {
      if (!cancelled) {
        void loadReviews()
      }
    }

    if (scheduler.requestIdleCallback) {
      idleHandle = scheduler.requestIdleCallback(run, { timeout: 1500 })
    } else {
      timeoutHandle = globalThis.setTimeout(run, 0)
    }

    return () => {
      cancelled = true
      if (idleHandle !== null && scheduler.cancelIdleCallback) {
        scheduler.cancelIdleCallback(idleHandle)
      }
      if (timeoutHandle !== null) {
        globalThis.clearTimeout(timeoutHandle)
      }
    }
  }, [loadReviews])

  // Fetch initial wishlist state for this product on mount
  useEffect(() => {
    if (!user) return
    fetch('/api/wishlist')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.items) {
          setWishlisted(data.items.some((item: { product_id: number }) => item.product_id === product.id))
        }
      })
      .catch(() => {})
  }, [user, product.id])

  // Close share dropdown when clicking outside
  useEffect(() => {
    if (!shareOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [shareOpen])

  const handleAddToCart = async (redirect: boolean = false) => {
    if (!user) { router.push('/login'); return }
    if (product.sizes?.length > 0 && !selectedSize) {
      toast.error('Please select a size')
      return
    }

    if (redirect) setBuyingNow(true)
    else setAdding(true)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('userToken') : null
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ product_id: product.id, quantity, size: selectedSize }),
      })
      const data = await res.json()
      if (res.ok) {
        refreshCart()
        if (redirect) {
          router.push('/checkout')
        } else {
          toast.success('Added to cart!')
        }
      } else {
        toast.error(data?.error || 'Failed to add to cart')
      }
    } finally {
      setAdding(false)
      setBuyingNow(false)
    }
  }

  const handleWishlist = async () => {
    if (!user) { router.push('/login'); return }
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id }),
    })
    const data = await res.json()
    setWishlisted(data.action === 'added')
    toast.success(data.action === 'added' ? 'Added to wishlist' : 'Removed from wishlist')
  }

  const copyLink = () => {
    navigator.clipboard.writeText(productUrl)
    toast.success('Product link copied to clipboard!')
    setShareOpen(false)
  }

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Check out ${product.name} on ZYRØCORE: ${productUrl}`)
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
  }

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`, '_blank')
  }

  const shareTwitter = () => {
    const text = encodeURIComponent(`Check out ${product.name} on ZYRØCORE`)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(productUrl)}`, '_blank')
  }

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(product.name)}`, '_blank')
  }

  const shareEmail = () => {
    const subject = encodeURIComponent(`Check out ${product.name} on ZYRØCORE`)
    const body = encodeURIComponent(`I thought you might like this product: ${product.name}\n\n${productUrl}`)
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  const shareInstagram = () => {
    navigator.clipboard.writeText(productUrl)
    toast.success('Link copied! Open Instagram to paste and share.')
    setShareOpen(false)
  }

  // Review image upload handler with client-side compression
  const handleReviewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const files = Array.from(e.target.files)
    setUploadingReviewImg(true)

    const uploaded: string[] = []

    for (const rawFile of files) {
      try {
        const compressed = await compressImageFile(rawFile, 1600, 0.85)
        const fd = new FormData()
        fd.append('file', compressed)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: fd,
        })
        const json = await safeParseJson(res)
        if (res.ok && json?.url) {
          uploaded.push(json.url)
        } else {
          toast.error(json?.error || `Failed to upload ${rawFile.name}`)
        }
      } catch {
        toast.error(`Failed to upload ${rawFile.name}`)
      }
    }

    setReviewImages(prev => [...prev, ...uploaded].slice(0, 3))
    setUploadingReviewImg(false)
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { router.push('/login'); return }
    setSubmittingReview(true)

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: product.id,
          rating: reviewRating,
          title: reviewTitle,
          comment: reviewComment,
          images: reviewImages,
        }),
      })

      if (res.ok) {
        toast.success(reviewsData.userReview ? 'Review updated!' : 'Thank you! Your review has been submitted.')
        loadReviews()
      } else {
        const json = await res.json()
        toast.error(json.error || 'Failed to submit review')
      }
    } catch {
      toast.error('Error submitting review')
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleDeleteReview = async () => {
    if (!confirm('Are you sure you want to delete your review?')) return
    try {
      const res = await fetch(`/api/reviews?product_id=${product.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Review deleted')
        setReviewRating(5)
        setReviewTitle('')
        setReviewComment('')
        setReviewImages([])
        loadReviews()
      }
    } catch {
      toast.error('Failed to delete review')
    }
  }

  return (
    <div className="bg-background min-h-screen">
      {/* pb-28 prevents sticky bottom bar from covering content on mobile */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8 md:py-12 pb-28 md:pb-12">
        {/* Breadcrumb — compact on mobile, full on desktop */}
        <nav className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground mb-4 sm:mb-8 md:mb-12 overflow-hidden" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-foreground transition-colors flex-shrink-0">Home</Link>
          <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
          <Link href="/products" className="hover:text-foreground transition-colors flex-shrink-0">Shop</Link>
          {product.category_name && (
            <>
              <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0 hidden sm:block" />
              <Link
                href={`/products?category=${product.category_slug}`}
                className="hover:text-foreground transition-colors hidden sm:block flex-shrink-0"
              >
                {product.category_name}
              </Link>
            </>
          )}
          <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
          <span className="text-foreground truncate font-medium min-w-0">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-10 lg:gap-12 items-start">
          {/* Images */}
          <div className="space-y-4 md:sticky md:top-24 md:self-start">
            <div
              className="relative aspect-[4/5] md:aspect-[5/6] lg:aspect-[4/5] rounded-2xl overflow-hidden bg-muted/30 border border-border group cursor-zoom-in"
              onClick={() => openLightbox(activeImage)}
            >
              {product.images?.[activeImage] ? (
                <Image
                  src={product.images[activeImage]}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No image
                </div>
              )}
              {discount > 0 && (
                <Badge className="absolute top-3 left-3 bg-foreground text-background">
                  -{discount}% OFF
                </Badge>
              )}
              <div className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/60 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-xs font-medium">
                <ZoomIn className="w-4 h-4" /> Click to Zoom
              </div>
            </div>

            {/* Thumbnail Navigation Bar — horizontal scroll with momentum */}
            {product.images?.length > 1 && (
              <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scroll-x-contain md:pb-1">
                {product.images.slice(0, 5).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    onDoubleClick={() => openLightbox(i)}
                    className={`relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all touch-manipulation ${
                      activeImage === i ? 'border-foreground shadow-md scale-105' : 'border-border opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Image src={img} alt={`View ${i + 1}`} fill className="object-cover" sizes="80px" />
                  </button>
                ))}

                {/* 6th position "+X More" Overlay Thumbnail */}
                {product.images.length > 5 && (
                  <button
                    onClick={() => openLightbox(5)}
                    className="relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 border-foreground/40 bg-foreground text-background font-bold flex flex-col items-center justify-center gap-0.5 hover:scale-105 transition-all shadow-md group touch-manipulation"
                  >
                    <Image src={product.images[5]} alt="More images" fill className="object-cover opacity-30 group-hover:opacity-20 transition-opacity" sizes="80px" />
                    <span className="relative z-10 text-sm font-extrabold">+{product.images.length - 5}</span>
                    <span className="relative z-10 text-[9px] uppercase tracking-wider font-semibold">More</span>
                  </button>
                )}
              </div>
            )}
          </div>

        {/* Info */}
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-widest text-accent font-semibold">{product.category_name || 'First Collection'}</p>

            {/* Share Button & Popup Menu */}
            <div className="relative" ref={shareRef}>
              <button
                onClick={() => setShareOpen(!shareOpen)}
                suppressHydrationWarning
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-border hover:border-accent transition-colors bg-background text-foreground"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>

              {shareOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-xl shadow-xl z-50 p-2 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">Share Product</p>
                  <button onClick={shareWhatsApp} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-muted text-foreground transition-colors">
                    <MessageCircle className="w-4 h-4 text-green-600" /> WhatsApp
                  </button>
                  <button onClick={shareInstagram} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-muted text-foreground transition-colors">
                    <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 inline-block flex-shrink-0" /> Instagram
                  </button>
                  <button onClick={shareFacebook} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-muted text-foreground transition-colors">
                    <Facebook className="w-4 h-4 text-blue-600" /> Facebook
                  </button>
                  <button onClick={shareTwitter} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-muted text-foreground transition-colors">
                    <Twitter className="w-4 h-4 text-sky-500" /> X (Twitter)
                  </button>
                  <button onClick={shareTelegram} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-muted text-foreground transition-colors">
                    <Send className="w-4 h-4 text-sky-600" /> Telegram
                  </button>
                  <button onClick={shareEmail} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-muted text-foreground transition-colors">
                    <Mail className="w-4 h-4 text-neutral-500" /> Email
                  </button>
                  <div className="border-t border-border pt-1 mt-1">
                    <button onClick={copyLink} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-muted text-foreground font-semibold transition-colors">
                      <Copy className="w-4 h-4 text-foreground" /> Copy Product Link
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <h1 className="font-bold text-foreground text-pretty mb-4 sm:mb-6 leading-tight" style={{ fontSize: 'clamp(1.5rem, 4.5vw, 3rem)' }}>
            {product.name}
          </h1>

          {/* Rating Summary Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center">
              {STAR_INDICES.map(i => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < Math.round(Number(reviewsData.averageRating) || 0) ? 'fill-foreground text-foreground' : 'text-border'}`}
                />
              ))}
            </div>
            <span className="text-sm font-bold">{Number(reviewsData.averageRating) > 0 ? Number(reviewsData.averageRating).toFixed(1) : 'New'}</span>
            <span className="text-sm text-muted-foreground">({reviewsData.totalReviews} customer rating{reviewsData.totalReviews === 1 ? '' : 's'})</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-5">
            <span className="text-3xl font-bold text-foreground">{formatPrice(effectivePrice)}</span>
            {product.discount_price && (
              <span className="text-lg text-muted-foreground line-through">{formatPrice(product.price)}</span>
            )}
            {discount > 0 && (
              <span className="text-sm font-medium text-green-600">Save {discount}%</span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">{product.description}</p>
          )}

          {/* Sizes */}
          {(() => {
            const liveProduct: Product = (typeof window !== 'undefined' && (product as any))
            const liveSizes = liveProduct?.sizes?.length ? liveProduct.sizes : product.sizes || []
            const liveSizeStock = liveProduct?.size_stock || product.size_stock || {}

            return liveSizes.length > 0 ? (
              <div className="mb-5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Select Size {selectedSize && <span className="text-muted-foreground font-bold">— {selectedSize}</span>}</p>
                  {selectedSize && (
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${
                      getAvailableStockForSize(product.stock, liveSizeStock, selectedSize) === 0
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-green-100 text-green-800 border border-green-200'
                    }`}>
                      {getAvailableStockForSize(product.stock, liveSizeStock, selectedSize) === 0
                        ? 'Out of Stock'
                        : 'Available'}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {liveSizes.map(size => {
                    const avail = getAvailableStockForSize(product.stock, liveSizeStock, size)
                    const isOutOfStock = avail <= 0

                    return (
                      <button
                        key={size}
                        disabled={isOutOfStock}
                        onClick={() => setSelectedSize(size)}
                        className={`relative min-w-[3rem] h-10 px-3 text-sm rounded-xl border transition-all font-medium flex items-center justify-center gap-1 ${
                          isOutOfStock
                            ? 'border-border/40 text-muted-foreground/40 bg-muted/20 cursor-not-allowed line-through'
                            : selectedSize === size
                            ? 'bg-foreground text-background border-foreground shadow-md font-bold'
                            : 'border-border text-foreground hover:border-foreground/50 bg-background'
                        }`}
                      >
                        <span className="font-bold">{size}</span>
                        {isOutOfStock && <span className="text-[9px] uppercase font-bold text-red-500 no-underline">OOS</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null
          })()}

          {/* Quantity */}
          {(() => {
            const liveSizeStock = product.size_stock || {}
            const maxAvailableStock = getAvailableStockForSize(product.stock, liveSizeStock, selectedSize)

            return (
              <div className="mb-5">
                <p className="text-sm font-medium mb-2">Quantity</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => Math.min(maxAvailableStock, q + 1))}
                    className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    aria-label="Increase quantity"
                    disabled={quantity >= maxAvailableStock || maxAvailableStock === 0}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-semibold ml-2 text-foreground">
                    {maxAvailableStock > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
              </div>
            )
          })()}

          {/* Dual Actions: Buy Now & Add to Cart (Desktop View) */}
          <div className="hidden md:flex gap-3 mb-6">
            <Button
              size="lg"
              variant="outline"
              className="flex-1 border-2 border-foreground hover:bg-foreground hover:text-background font-bold transition-all"
              onClick={() => handleAddToCart(false)}
              disabled={adding || buyingNow || product.stock === 0}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {product.stock === 0 ? 'Out of Stock' : adding ? 'Adding...' : 'Add to Cart'}
            </Button>

            <Button
              size="lg"
              className="flex-1 bg-foreground text-background hover:bg-foreground/90 font-bold transition-all"
              onClick={() => handleAddToCart(true)}
              disabled={adding || buyingNow || product.stock === 0}
            >
              {buyingNow ? 'Redirecting...' : 'Buy Now'}
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={handleWishlist}
              aria-label="Add to wishlist"
              className="w-12 flex-shrink-0"
            >
              <Heart className={`w-5 h-5 ${wishlisted ? 'fill-foreground text-foreground' : ''}`} />
            </Button>
          </div>

          {/* Sticky Mobile Purchase Bar (Always visible on mobile viewports < 768px) */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-2 shadow-2xl backdrop-blur-md">
            <div className="flex flex-col pr-2 shrink-0">
              <span className="text-xs text-muted-foreground line-through">{product.discount_price && formatPrice(product.price)}</span>
              <span className="text-base font-extrabold text-foreground">{formatPrice(effectivePrice)}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-11 border-foreground text-foreground font-bold text-xs"
              onClick={() => handleAddToCart(false)}
              disabled={adding || buyingNow || product.stock === 0}
            >
              <ShoppingCart className="w-3.5 h-3.5 mr-1" />
              {product.stock === 0 ? 'OOS' : adding ? 'Adding...' : 'Add'}
            </Button>
            <Button
              size="sm"
              className="flex-1 h-11 bg-foreground text-background font-bold text-xs"
              onClick={() => handleAddToCart(true)}
              disabled={adding || buyingNow || product.stock === 0}
            >
              {buyingNow ? 'Redirecting...' : 'Buy Now'}
            </Button>
          </div>

          {/* Features */}
          <div className="border-t border-border pt-5 space-y-2">
            {[
              { icon: Check, text: 'Free shipping on all orders' },
              { icon: SITE_CONFIG.returnsEnabled ? Check : Info, text: SITE_CONFIG.returnsEnabled ? '15-day hassle-free returns' : 'Returns Currently Unavailable' },
              { icon: Check, text: 'Instant UPI Payment verification' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="w-4 h-4 text-foreground flex-shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Details Collapsible Dropdown Menu */}
      <section className="mt-10 border-t border-border pt-8">
        <Accordion type="single" collapsible defaultValue="details" className="w-full bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
          <AccordionItem value="details" className="border-b-0 px-5 sm:px-6">
            <AccordionTrigger className="text-base sm:text-lg font-bold text-foreground hover:no-underline py-5">
              <span className="flex items-center gap-2.5">
                <Info className="w-5 h-5 text-accent" />
                <span>Details</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6 space-y-6">
              {/* Dynamic Key-Value Specifications */}
              {parsedDetails.length > 0 && (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {parsedDetails.map(([key, val]) => (
                    <div key={key} className="bg-muted/40 border border-border/70 rounded-xl p-4 space-y-1 hover:border-foreground/30 transition-colors">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">{key}</span>
                      <span className="text-sm font-semibold text-foreground block break-words">{val}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Standard Construction & Care Specs */}
              <div className="grid md:grid-cols-3 gap-6 bg-muted/20 border border-border/60 rounded-xl p-5 sm:p-6">
                {/* Highlights */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-foreground" /> Highlights & Construction
                  </h3>
                  <ul className="text-sm text-foreground space-y-1.5 list-disc list-inside">
                    <li>Premium quality crafted for daily ambitious style</li>
                    <li>Pre-shrunk fabric ensuring long-lasting fit durability</li>
                    <li>Reinforced stitching across high-stress points</li>
                    <li>Breathable, climate-adaptive weaving</li>
                  </ul>
                </div>

                {/* Specifications */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-foreground" /> Fabric & Care Instructions
                  </h3>
                  <div className="text-sm text-foreground space-y-1.5">
                    <p><span className="font-semibold text-muted-foreground">Material:</span> 100% Premium Cotton / Blend</p>
                    <p><span className="font-semibold text-muted-foreground">Wash Care:</span> Machine wash cold with like colors</p>
                    <p><span className="font-semibold text-muted-foreground">Drying:</span> Tumble dry low or line dry in shade</p>
                    <p><span className="font-semibold text-muted-foreground">Ironing:</span> Warm iron on reverse side</p>
                  </div>
                </div>

                {/* Delivery & Warranty */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-foreground" /> Delivery & Origin Information
                  </h3>
                  <div className="text-sm text-foreground space-y-1.5">
                    <p><span className="font-semibold text-muted-foreground">Country of Origin:</span> India</p>
                    <p><span className="font-semibold text-muted-foreground">Dispatch:</span> Ships within 24-48 business hours</p>
                    <p><span className="font-semibold text-muted-foreground">Returns:</span> {SITE_CONFIG.returnsEnabled ? '15-day return policy' : 'Returns Currently Unavailable'}</p>
                    <p><span className="font-semibold text-muted-foreground">Authenticity:</span> 100% Genuine ZYRØCORE Guarantee</p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* Customer Ratings & Reviews Section */}
      <section className="mt-16 border-t border-border pt-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Customer Reviews & Ratings</h2>
            <p className="text-sm text-muted-foreground mt-1">Real feedback from verified ZYRØCORE customers</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Overall Rating Score Card */}
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <p className="text-5xl font-black text-foreground mb-2">
              {Number(reviewsData.averageRating) > 0 ? Number(reviewsData.averageRating).toFixed(1) : '0.0'}
            </p>
            <div className="flex items-center gap-1 mb-2">
              {STAR_INDICES.map(i => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${i < Math.round(Number(reviewsData.averageRating) || 0) ? 'fill-foreground text-foreground' : 'text-border'}`}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground font-medium">Based on {reviewsData.totalReviews} review{reviewsData.totalReviews === 1 ? '' : 's'}</p>
          </div>

          {/* Rating Distribution Breakdown Bars */}
          <div className="md:col-span-2 bg-card border border-border rounded-xl p-6 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Rating Breakdown</h3>
            {[5, 4, 3, 2, 1].map(star => {
              const count = reviewsData.breakdown[star] || 0
              const percentage = reviewsData.totalReviews > 0 ? Math.round((count / reviewsData.totalReviews) * 100) : 0
              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <span className="w-8 font-semibold text-foreground flex items-center gap-0.5">{star} <Star className="w-3 h-3 fill-foreground inline" /></span>
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-foreground transition-all duration-500 rounded-full" style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="w-12 text-right text-muted-foreground font-mono">{count} ({percentage}%)</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Submit or Edit Review Form */}
        <div className="bg-card border border-border rounded-xl p-6 mb-10 shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-4">
            {reviewsData.userReview ? 'Edit Your Review' : 'Write a Customer Review'}
          </h3>

          {!user ? (
            <div className="text-center py-6 border border-dashed border-border rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">Please sign in to share your experience with this product.</p>
              <Button asChild size="sm"><Link href="/login">Sign In to Review</Link></Button>
            </div>
          ) : (
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-2">Select Your Rating *</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-7 h-7 cursor-pointer ${
                          star <= reviewRating ? 'fill-foreground text-foreground' : 'text-border'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-sm font-semibold text-foreground ml-3">{reviewRating} out of 5 Stars</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Review Headline</label>
                <input
                  value={reviewTitle}
                  onChange={e => setReviewTitle(e.target.value)}
                  placeholder="e.g. Excellent fit & premium material quality!"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Review Details</label>
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  rows={3}
                  placeholder="Share details about the fabric, sizing, comfort, and performance..."
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
                />
              </div>

              {/* Review Photo Upload */}
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Attach Review Photos (Optional)</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold px-3 py-2 rounded-lg border border-border transition-colors">
                    <Camera className="w-4 h-4" />
                    {uploadingReviewImg ? 'Uploading...' : 'Add Photos'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleReviewImageUpload}
                      disabled={uploadingReviewImg || reviewImages.length >= 3}
                    />
                  </label>
                  <span className="text-xs text-muted-foreground">{reviewImages.length}/3 photos attached</span>
                </div>

                {reviewImages.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {reviewImages.map((imgUrl, i) => (
                      <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-border group">
                        <Image src={imgUrl} alt="Review attachment" fill sizes="56px" unoptimized className="object-cover" />
                        <button
                          type="button"
                          onClick={() => setReviewImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={submittingReview} size="sm">
                  {submittingReview ? 'Submitting...' : reviewsData.userReview ? 'Update Review' : 'Submit Review'}
                </Button>
                {reviewsData.userReview && (
                  <Button type="button" variant="outline" size="sm" onClick={handleDeleteReview} className="text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4 mr-1" /> Delete Review
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Customer Reviews List */}
        <div className="space-y-4">
          {loadingReviews ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading customer reviews...</div>
          ) : reviewsData.reviews.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="font-semibold text-foreground">No customer reviews yet</p>
              <p className="text-xs text-muted-foreground mt-1">Be the first customer to leave a review for this product!</p>
            </div>
          ) : (
            reviewsData.reviews.map(rev => (
              <div key={rev.id} className="bg-card border border-border rounded-xl p-5 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-foreground text-background font-bold text-xs flex items-center justify-center">
                      {rev.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        {rev.user_name}
                        {rev.is_verified && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full font-semibold">
                            <ShieldCheck className="w-3 h-3" /> Verified Buyer
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(rev.created_at)}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {STAR_INDICES.map(i => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < rev.rating ? 'fill-foreground text-foreground' : 'text-border'}`}
                    />
                  ))}
                </div>

                {rev.title && <h4 className="font-semibold text-sm text-foreground">{rev.title}</h4>}
                {rev.comment && <p className="text-sm text-muted-foreground leading-relaxed">{rev.comment}</p>}

                {rev.images && rev.images.length > 0 && (
                  <div className="flex gap-2 pt-2">
                    {rev.images.map((img, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                        <Image src={img} alt="Customer attachment" fill sizes="64px" unoptimized className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-bold text-foreground mb-6">You Might Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Lightbox Modal */}
      <ProductLightbox
        images={product.images || []}
        initialIndex={lightboxIndex}
        productName={product.name}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
    </div>
  )
}
