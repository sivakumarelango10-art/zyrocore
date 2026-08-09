'use client'

import Link from 'next/link'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Info, Phone, Mail, ArrowLeft, Instagram } from 'lucide-react'
import { SITE_CONFIG, openInstagramDm } from '@/lib/site-config'

export default function ReturnsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-16 w-full flex items-center justify-center">
        <div className="bg-card border border-border rounded-3xl p-8 md:p-12 shadow-xl text-center space-y-6 relative overflow-hidden w-full">
          {/* Subtle decorative background gradient */}
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-flex p-4 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-inner">
            <Info className="w-10 h-10" />
          </div>

          <div className="space-y-3 max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-3 py-1 bg-muted rounded-full">
              Store Policy Update
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              {SITE_CONFIG.returnsEnabled ? 'Return & Exchange Policy' : 'Returns Currently Unavailable'}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {SITE_CONFIG.returnsEnabled ? (
                'We offer a 15-day return policy for unused items in original packaging.'
              ) : (
                <strong className="text-foreground font-semibold">
                  Returns are currently unavailable. Please contact our support team if you need assistance with your order.
                </strong>
              )}
            </p>
          </div>

          {/* Action buttons for Customer Support */}
          <div className="pt-4 max-w-sm mx-auto">
            <Button asChild size="lg" className="w-full font-bold">
              <a href={SITE_CONFIG.mailtoInquiry} className="flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" /> Email Support
              </a>
            </Button>
          </div>

          <div className="pt-2">
            <button
              onClick={() => openInstagramDm()}
              className="inline-flex items-center gap-2 text-xs font-semibold text-accent hover:underline cursor-pointer"
            >
              <Instagram className="w-4 h-4" /> Message us on Instagram DM ({SITE_CONFIG.social.instagramHandle})
            </button>
          </div>

          <div className="pt-6 border-t border-border flex items-center justify-center">
            <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
              <Link href="/products" className="flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Collection
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
