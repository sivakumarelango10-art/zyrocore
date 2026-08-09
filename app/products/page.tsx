import { Suspense } from 'react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import ProductsClient from './products-client'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Shop — ZYRØCORE',
  description: 'Browse premium men\'s formals, casuals, party wear and accessories at ZYRØCORE.',
}

export default function ProductsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Suspense fallback={
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border overflow-hidden">
                  <Skeleton className="aspect-square" />
                </div>
              ))}
            </div>
          </div>
        }>
          <ProductsClient />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
