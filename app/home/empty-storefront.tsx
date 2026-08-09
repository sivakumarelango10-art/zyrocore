import Link from 'next/link'
import { Shirt } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function EmptyStorefront() {
  return (
    <section className="max-w-2xl mx-auto px-4 py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
        <Shirt className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold text-foreground text-balance mb-3">
        New styles coming soon
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-8">
        We are currently adding our latest collection. Check back soon or browse by category to see what{"'"}s available.
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Button asChild>
          <Link href="/products">Browse All Products</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/products?category=formals">Shop Formals</Link>
        </Button>
      </div>
    </section>
  )
}
