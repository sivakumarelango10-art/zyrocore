import Link from 'next/link'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { PrimaryButton } from '@/components/ui/primary-button'
import { Compass, ShoppingBag, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: '404 Page Not Found — ZYRØCORE',
  description: 'The page or resource you requested could not be found.',
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-muted/40 border border-border flex items-center justify-center mx-auto text-accent shadow-lg">
            <Compass className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase font-extrabold tracking-[0.25em] text-muted-foreground">
              404 — Page Not Found
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Lost in the Journey?
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The page or product you are looking for might have been moved, renamed, or is temporarily unavailable.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <PrimaryButton href="/shop" variant="default">
              <ShoppingBag className="w-4 h-4 mr-2" /> Explore Collection
            </PrimaryButton>

            <Button variant="outline" size="sm" asChild className="h-11 px-5 font-semibold text-xs border-border">
              <Link href="/">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
