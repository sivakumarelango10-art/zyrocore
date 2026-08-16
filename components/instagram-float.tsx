'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Instagram, X, MessageCircle, ExternalLink } from 'lucide-react'
import { SITE_CONFIG, openInstagramDm } from '@/lib/site-config'

export default function InstagramFloat() {
  const [showQr, setShowQr] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pathname = usePathname()

  // Do not render Instagram float widget in the admin panel
  if (pathname.startsWith('/admin') || pathname.startsWith('/secure-admin')) {
    return null
  }

  const isBottomDockedRoute = pathname.startsWith('/products/') || pathname === '/cart' || pathname === '/checkout'

  const bottomOffset = isBottomDockedRoute
    ? 'calc(6rem + env(safe-area-inset-bottom))'
    : 'max(1.5rem, env(safe-area-inset-bottom))'

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setShowQr(true)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setShowQr(false)
    }, 200)
  }

  const handleDmClick = (e: React.MouseEvent) => {
    e.preventDefault()
    openInstagramDm()
  }

  return (
    <div
      className="fixed right-6 z-50 flex flex-col items-end select-none pointer-events-auto"
      style={{ bottom: bottomOffset }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative flex flex-col items-end">
        {/* QR Code Pop-up Card - Positioned absolutely above the button */}
        <div
          onClick={handleDmClick}
          className={`absolute bottom-16 right-0 bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl p-5 shadow-2xl w-64 text-center overflow-hidden cursor-pointer group hover:border-rose-500/50 transition-all duration-200 ease-out origin-bottom-right ${
            showQr
              ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto shadow-rose-500/20'
              : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowQr(false)
            }}
            aria-label="Close QR Modal"
            className="absolute top-3 right-3 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white mb-2 shadow-md group-hover:scale-105 transition-transform">
            <Instagram className="w-6 h-6" />
          </div>

          <h3 className="font-bold text-sm text-foreground">Message Us on Instagram</h3>
          <p className="text-xs text-rose-500 font-bold mt-0.5">{SITE_CONFIG.social.instagramHandle}</p>

          {/* Pre-decoded QR Code Image */}
          <div className="my-3 p-2 bg-white rounded-xl border border-neutral-200 shadow-inner flex flex-col items-center justify-center gap-1.5 relative group-hover:shadow-md transition-shadow">
            <div className="relative flex items-center justify-center bg-white rounded-lg overflow-hidden">
              <Image
                src="/instagram-qr.jpg"
                alt="Instagram @ZYROCORE.OFFICIAL QR Code"
                width={176}
                height={176}
                priority
                quality={90}
                className="w-44 h-auto object-contain rounded-lg"
              />
            </div>
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-700 flex items-center gap-1">
              Scan or Click to DM <ExternalLink className="w-3 h-3 text-rose-500 inline" />
            </span>
          </div>

          <button
            onClick={handleDmClick}
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 via-rose-500 to-amber-500 hover:opacity-95 text-white font-semibold text-xs rounded-xl shadow-md transition-all active:scale-98"
          >
            <MessageCircle className="w-3.5 h-3.5" /> DM {SITE_CONFIG.social.instagramHandle}
          </button>
        </div>

        {/* Floating Instagram Action Button Symbol */}
        <div className="relative">
          <button
            onClick={handleDmClick}
            onMouseEnter={handleMouseEnter}
            onFocus={handleMouseEnter}
            aria-label="DM ZYRØCORE on Instagram"
            className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-[0_6px_24px_rgba(225,48,108,0.4)] hover:shadow-[0_10px_32px_rgba(225,48,108,0.6)] transform hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Instagram className="w-7 h-7" />
          </button>

          {/* Pulse Indicator */}
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border-2 border-background"></span>
          </span>
        </div>
      </div>
    </div>
  )
}

