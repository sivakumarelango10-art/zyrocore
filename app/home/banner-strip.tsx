'use client'

import { Truck, RotateCcw, Shield, Sparkles, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SITE_CONFIG } from '@/lib/site-config'

export default function BannerStrip() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const features = [
    { icon: Truck, title: 'Free Shipping', desc: 'On orders over ₹999' },
    {
      icon: SITE_CONFIG.returnsEnabled ? RotateCcw : Info,
      title: SITE_CONFIG.returnsEnabled ? 'Easy Returns' : 'No Returns',
      desc: SITE_CONFIG.returnsEnabled ? '15-day hassle-free returns' : SITE_CONFIG.returnPolicyMessage,
    },
    { icon: Shield, title: 'Authentic', desc: '100% genuine brands' },
    { icon: Sparkles, title: 'New Arrivals', desc: 'Fresh styles weekly' },
  ]

  return (
    <section className="bg-secondary/50 border-y border-border py-8 md:py-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className={`flex flex-col items-center md:items-start gap-2 md:gap-3 text-center md:text-left transform transition-all duration-700 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 md:w-6 md:h-6 text-accent" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-foreground leading-tight">{title}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-tight line-clamp-2">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
