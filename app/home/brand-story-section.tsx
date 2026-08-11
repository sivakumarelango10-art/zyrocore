import Link from 'next/link'
import { PrimaryButton } from '@/components/ui/primary-button'
import { ShieldCheck, Compass, Sparkles } from 'lucide-react'

export default function BrandStorySection() {
  return (
    <section className="bg-muted/20 border-t border-border py-12 md:py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Main Section Heading — H2 following H1 */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-accent mb-3">
            Our Purpose & Craftsmanship
          </p>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-tight mb-4">
            The ZYRØCORE Philosophy — Apparel for the Driven
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            ZYRØCORE was established to redefine contemporary activewear and lifestyle clothing. We engineer versatile apparel designed for individuals who demand uncompromising quality, subtle elegance, and enduring durability in every garment.
          </p>
        </div>

        {/* 3 Sub-sections — H3 headings following H2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:border-foreground/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-2">
              Engineered Precision
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Every seam, fabric blend, and silhouette is crafted through rigorous design iterations. Our activewear and daily essentials feature moisture-regulating technology, four-way stretch flexibility, and reinforced stitching engineered for high-intensity movement and refined daily wear.
            </p>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:border-foreground/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-2">
              Timeless Aesthetic
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Fast fashion trends fade quickly. We focus on clean, architectural lines, monochromatic palettes, and understated detailing that remain effortless season after season. Elevate your wardrobe with pieces that effortlessly transition from training sessions to casual evenings.
            </p>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:border-foreground/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-2">
              Uncompromising Quality
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              We source premium technical textiles and eco-conscious cottons to ensure superior hand-feel, wash durability, and shape retention. Experience luxury craftsmanship designed to support your ambitious pursuits every single day.
            </p>
          </div>
        </div>

        {/* Closing Narrative & Call to Action */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-10 text-center shadow-sm">
          <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3">
            Join the Movement — Built for Ambitious
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-6">
            Whether you are pushing past your personal records or navigating urban routine, ZYRØCORE provides functional apparel tailored to your pace. Explore our full range of tees, hoodies, outerwear, and active accessories built for those who pave their own path.
          </p>
          <PrimaryButton href="/shop" variant="default" size="default" aria-label="Explore the ZYRØCORE Collection">
            Explore All Collections
          </PrimaryButton>
        </div>
      </div>
    </section>
  )
}
