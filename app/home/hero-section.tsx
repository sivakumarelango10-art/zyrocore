'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PrimaryButton } from '@/components/ui/primary-button'

const slides = [
  {
    title: 'Stop Following The Trend.',
    subtitle: 'Be Timeless.',
    cta: 'Explore Collection',
    href: '/shop',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/product2-MrjpbiVDhc1Nnt7rEHuFQpWG0mjnmu.png',
  },
  {
    title: 'Built For Ambitious.',
    subtitle: 'Built Different.',
    cta: 'Shop All',
    href: '/shop',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/product1-8hkDsCe2Wte7KzSRmuKPEWEhHiVKHd.png',
  },
]

export default function HeroSection() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const goTo = (index: number) => {
    if (index !== current) setCurrent(index)
  }

  return (
    /*
     * min-height uses max() so it always resolves to at least 580px.
     * This prevents section collapse on browsers where dvh/svh are unsupported.
     * On desktop md+: the image side is absolute right-0 covering the right 50%.
     * On mobile: the image covers the entire section behind a gradient overlay.
     */
    <section
      className="relative overflow-hidden bg-background border-b border-border"
      style={{ minHeight: 'max(520px, 72svh)' }}
    >
      {/* ── Background Image Layer ──────────────────────────────────────────── */}
      {/* Mobile: full-width behind gradient. Desktop md+: right 50% only.    */}
      <div className="absolute inset-0 md:left-1/2 md:top-0 md:bottom-0">
        {slides.map((s, idx) => (
          <div
            key={s.image}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              idx === current ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <Image
              src={s.image}
              alt={s.title}
              fill
              priority={idx === 0}
              loading={idx === 0 ? undefined : 'lazy'}
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-center"
            />
            {/* Mobile gradient: ensures text is legible over image */}
            <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/60 to-background/20 md:hidden" />
          </div>
        ))}
      </div>

      {/* ── Content Column ─────────────────────────────────────────────────── */}
      {/*
       * Takes full width on mobile (z-10 on top of gradient-darkened image).
       * Takes left 50% on desktop. Uses flex column to push nav below text.
       */}
      <div
        className="relative z-10 flex flex-col justify-between md:w-1/2 p-5 pt-8 sm:p-8 sm:pt-10 md:p-12 lg:p-16 transition-all duration-700 ease-out translate-y-0 opacity-100"
        style={{ minHeight: 'inherit' }}
      >
        {/* ── Slides ── */}
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-4 text-muted-foreground">
            ZYRØCORE Collection
          </p>

          {/* Slide text: use relative+absolute so only active is in flow */}
          <div className="relative" style={{ minHeight: 'clamp(180px, 34vw, 280px)' }}>
            {slides.map((s, idx) => (
              <div
                key={s.title}
                className={`transition-all duration-700 ease-out ${
                  idx === current
                    ? 'opacity-100 translate-y-0 relative z-10 pointer-events-auto'
                    : 'opacity-0 translate-y-4 absolute inset-0 z-0 pointer-events-none'
                }`}
              >
                <h1
                  className="font-bold tracking-tight text-foreground leading-[1.05]"
                  style={{ fontSize: 'clamp(1.75rem, 6vw, 4.5rem)' }}
                >
                  {s.title}
                </h1>
                <p
                  className="text-muted-foreground mt-3 font-light leading-relaxed"
                  style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.25rem)' }}
                >
                  {s.subtitle}
                </p>
                <div className="mt-6 sm:mt-8">
                  <PrimaryButton
                    href={s.href}
                    variant="hero"
                    size="default"
                    aria-label={`${s.cta} — Go to Shop`}
                  >
                    {s.cta}
                  </PrimaryButton>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Slide Navigation ─────────────────────────────────────────────── */}
        {/*
         * Placed IN-FLOW below the text content (not absolutely positioned),
         * ensuring it always sits below the CTA button at every screen size.
         */}
        <div className="flex items-center justify-center gap-4 mt-8 sm:mt-10">
          <button
            onClick={() => goTo((current - 1 + slides.length) % slides.length)}
            aria-label="Previous slide"
            suppressHydrationWarning
            className="w-9 h-9 flex items-center justify-center rounded-full
                       border border-border/60 bg-background/60 backdrop-blur-sm
                       text-foreground/70 hover:text-foreground hover:bg-muted
                       transition-all touch-manipulation"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                suppressHydrationWarning
                className={`rounded-full transition-all duration-500 ease-out touch-manipulation ${
                  i === current
                    ? 'w-7 h-2 bg-foreground'
                    : 'w-2 h-2 bg-muted-foreground/40 hover:bg-foreground/70'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => goTo((current + 1) % slides.length)}
            aria-label="Next slide"
            suppressHydrationWarning
            className="w-9 h-9 flex items-center justify-center rounded-full
                       border border-border/60 bg-background/60 backdrop-blur-sm
                       text-foreground/70 hover:text-foreground hover:bg-muted
                       transition-all touch-manipulation"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  )
}
