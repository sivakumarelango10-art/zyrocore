'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react'

interface LightboxProps {
  images: string[]
  initialIndex: number
  productName: string
  isOpen: boolean
  onClose: () => void
}

export default function ProductLightbox({
  images,
  initialIndex,
  productName,
  isOpen,
  onClose,
}: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoomed, setZoomed] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  // Touch Swipe tracking
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  useEffect(() => {
    setCurrentIndex(initialIndex)
    setZoomed(false)
  }, [initialIndex, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') handlePrev()
      else if (e.key === 'ArrowRight') handleNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, currentIndex, images.length])

  if (!isOpen || images.length === 0) return null

  const handlePrev = () => {
    setImageLoading(true)
    setZoomed(false)
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setImageLoading(true)
    setZoomed(false)
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomed) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setZoomPosition({ x, y })
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNext()
      else handlePrev()
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md animate-fade-in select-none">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40 text-white z-10">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 truncate max-w-md">
          <span className="truncate">{productName}</span>
          <span className="text-neutral-500">•</span>
          <span className="text-white font-mono">{currentIndex + 1} / {images.length}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomed(!zoomed)}
            title={zoomed ? 'Zoom Out' : 'Zoom In'}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-neutral-300 hover:text-white"
          >
            {zoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-neutral-300 hover:text-white hidden sm:block"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button
            onClick={onClose}
            title="Close (Esc)"
            className="p-2 rounded-full hover:bg-white/20 transition-colors text-white bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Image Area */}
      <div
        role="button"
        tabIndex={0}
        aria-label={zoomed ? 'Zoom out image' : 'Zoom in image'}
        aria-pressed={zoomed}
        className="flex-1 relative flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseMove={handleMouseMove}
        onClick={() => setZoomed(!zoomed)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setZoomed(prev => !prev)
          }
        }}
      >
        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={e => { e.stopPropagation(); handlePrev() }}
              aria-label="Previous Image"
              className="absolute left-4 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 shadow-lg transition-transform active:scale-90"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); handleNext() }}
              aria-label="Next Image"
              className="absolute right-4 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 shadow-lg transition-transform active:scale-90"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Loading Skeleton */}
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* High-Res Image Display */}
        <div className="relative w-full h-full max-w-5xl max-h-[80vh] flex items-center justify-center p-4">
          <Image
            src={images[currentIndex]}
            alt={`${productName} - Image ${currentIndex + 1}`}
            fill
            sizes="100vw"
            priority
            onLoad={() => setImageLoading(false)}
            className={`object-contain transition-transform duration-300 ease-out ${
              zoomed ? 'scale-200 cursor-zoom-out' : 'scale-100 cursor-zoom-in'
            }`}
            style={
              zoomed
                ? { transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` }
                : undefined
            }
          />
        </div>
      </div>

      {/* Bottom Thumbnail Strip */}
      {images.length > 1 && (
        <div className="px-4 py-3 bg-black/80 border-t border-white/10 flex items-center justify-center gap-2 overflow-x-auto z-10 scrollbar-none">
          {images.map((img, idx) => (
            <button
              key={img + idx}
              onClick={() => { setImageLoading(true); setZoomed(false); setCurrentIndex(idx) }}
              className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                currentIndex === idx ? 'border-white scale-105 shadow-md' : 'border-transparent opacity-50 hover:opacity-100'
              }`}
            >
              <Image src={img} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" sizes="56px" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
