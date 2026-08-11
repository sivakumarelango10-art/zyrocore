'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, ZoomIn, ZoomOut, RotateCw, Check, Undo2 } from 'lucide-react'

interface ImageCropModalProps {
  imageSrc: string
  fileName: string
  isOpen: boolean
  onClose: () => void
  onCropComplete: (croppedBlob: Blob, croppedUrl: string) => void
}

export default function ImageCropModal({
  imageSrc,
  fileName,
  isOpen,
  onClose,
  onCropComplete,
}: ImageCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0) // 0, 90, 180, 270
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [processing, setProcessing] = useState(false)

  // Load image into HTMLImageElement
  useEffect(() => {
    if (!imageSrc || !isOpen) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setImage(img)
      setZoom(1)
      setRotation(0)
      setOffset({ x: 0, y: 0 })
    }
    img.onerror = () => {
      console.error('Failed to load image for cropping')
    }
    img.src = imageSrc
  }, [imageSrc, isOpen])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !image) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = Math.min(canvas.width, canvas.height)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.save()

    // Move to center of canvas
    ctx.translate(canvas.width / 2, canvas.height / 2)

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180)

    // Apply scale and pan offset
    ctx.scale(zoom, zoom)
    ctx.translate(offset.x, offset.y)

    const imgAspect = image.width / image.height
    let drawWidth = size
    let drawHeight = size / imgAspect

    if (imgAspect < 1) {
      drawHeight = size
      drawWidth = size * imgAspect
    }

    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
    ctx.restore()
  }, [image, zoom, rotation, offset])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  // Mouse / Touch handlers for panning
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      })
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    })
  }

  const handleRotate = () => {
    setRotation(r => (r + 90) % 360)
  }

  const handleConfirmCrop = () => {
    const canvas = canvasRef.current
    if (!canvas || !image) return
    setProcessing(true)

    try {
      // Create off-screen canvas for high quality export
      const exportCanvas = document.createElement('canvas')
      const exportSize = Math.max(1200, Math.min(image.width, image.height))
      exportCanvas.width = exportSize
      exportCanvas.height = exportSize
      const exportCtx = exportCanvas.getContext('2d')

      if (exportCtx) {
        exportCtx.imageSmoothingEnabled = true
        exportCtx.imageSmoothingQuality = 'high'

        // Scale factor from preview canvas to high-res export canvas
        const scaleFactor = exportSize / canvas.width

        exportCtx.translate(exportSize / 2, exportSize / 2)
        exportCtx.rotate((rotation * Math.PI) / 180)
        exportCtx.scale(zoom, zoom)
        exportCtx.translate(offset.x * scaleFactor, offset.y * scaleFactor)

        const imgAspect = image.width / image.height
        let drawWidth = exportSize
        let drawHeight = exportSize / imgAspect

        if (imgAspect < 1) {
          drawHeight = exportSize
          drawWidth = exportSize * imgAspect
        }

        exportCtx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)

        exportCanvas.toBlob(
          blob => {
            if (blob) {
              const croppedUrl = URL.createObjectURL(blob)
              onCropComplete(blob, croppedUrl)
              onClose()
            }
            setProcessing(false)
          },
          'image/webp',
          0.92
        )
      }
    } catch (err) {
      console.error('Error cropping image:', err)
      setProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-neutral-200 flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-neutral-900 text-base">Crop Product Image</h3>
            <p className="text-xs text-neutral-500 truncate max-w-[260px]">{fileName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="p-6 flex flex-col items-center bg-neutral-900 justify-center relative select-none">
          <div className="relative w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] rounded-xl overflow-hidden shadow-inner bg-black border-2 border-dashed border-neutral-700 cursor-grab active:cursor-grabbing">
            <canvas
              ref={canvasRef}
              width={340}
              height={340}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              className="w-full h-full object-cover"
            />
            {/* Guide overlay */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20">
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-b border-white/20"></div>
              <div className="border-r border-white/20"></div>
              <div className="border-r border-white/20"></div>
              <div></div>
            </div>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">Drag to reposition image inside frame</p>
        </div>

        {/* Crop Controls */}
        <div className="p-5 bg-white space-y-4 border-t border-neutral-100">
          <div className="flex items-center gap-4">
            <ZoomOut className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              className="w-full accent-black h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-neutral-400 shrink-0" />

            <button
              onClick={handleRotate}
              className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors shrink-0 flex items-center gap-1 text-xs font-semibold"
              title="Rotate 90 degrees"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-semibold hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
            >
              <Undo2 className="w-4 h-4" /> Cancel
            </button>
            <button
              onClick={handleConfirmCrop}
              disabled={processing}
              className="px-5 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> {processing ? 'Cropping...' : 'Confirm & Use Crop'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
