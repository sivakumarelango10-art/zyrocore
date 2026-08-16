import Image from 'next/image'
import Link from 'next/link'
import { PrimaryButton } from '@/components/ui/primary-button'
import BrandStorySection from './brand-story-section'

export default function JourneySection() {
  return (
    <section className="bg-background py-0">
      {/* First: Mountain Road Journey */}
      {/* aspect-[4/3] on small mobile, [16/9] on sm, fixed height on md+ */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: 'clamp(300px, 60vw, 384px)' }}>
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Aug%204%2C%202026%2C%2006_09_47%20PM-3oooqJkYvF6ZjQ3BH1XsS1abUxjvgU.png"
          alt="Ambitious journey on mountain road"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent flex items-center">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 w-full">
            <div className="max-w-[min(28rem,90%)]">
              <p className="text-xs uppercase tracking-widest text-accent mb-3 font-semibold">
                Our Journey
              </p>
              <h2
                className="font-bold text-foreground mb-4 leading-tight"
                style={{ fontSize: 'clamp(1.75rem, 5.5vw, 3.75rem)' }}
              >
                Built from Tamil Nadu. Built in Public.
              </h2>
              <p
                className="text-muted-foreground mb-6 leading-relaxed hidden sm:block"
                style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.125rem)' }}
              >
                A middle class dream turned into a mission. Building a global brand, one step at a time.
              </p>
              <PrimaryButton href="/story" variant="default">
                Read Our Story
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>

      {/* Second: Minimalist Showroom Lifestyle */}
      <div className="grid md:grid-cols-2 gap-0">
        {/* Image — square on mobile, stretches on md+ */}
        <div className="relative overflow-hidden" style={{ minHeight: 'clamp(280px, 80vw, 384px)' }}>
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1000566637.png-TLRgYaZUZssSukm7SuHvezQPpprjj2.jpeg"
            alt="ZYRØCORE minimalist lifestyle showroom"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>

        <div className="bg-secondary/50 flex items-center p-6 sm:p-8 md:p-12 lg:p-16">
          <div className="max-w-md w-full">
            <p className="text-xs uppercase tracking-widest text-accent mb-3 font-semibold">
              The Philosophy
            </p>
            <h3
              className="font-bold text-foreground mb-4 leading-tight"
              style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)' }}
            >
              Timeless Design.
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">
              Minimal today. Relevant tomorrow. Timeless forever. Every piece is designed to transcend seasons and trends, built for those who refuse to follow the crowd.
            </p>
            <div className="space-y-3 sm:space-y-4">
              {[
                { title: 'Premium Quality', desc: '340 GSM cotton. Built to last.' },
                { title: 'Ethical Production', desc: 'Made responsibly. Made with care.' },
                { title: 'Timeless Style', desc: 'Designed to never go out of style.' },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm sm:text-base">{item.title}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Third: Product Craftsmanship Detail */}
      <div className="grid md:grid-cols-2 gap-0">
        <div className="bg-card flex items-center p-6 sm:p-8 md:p-12 lg:p-16 order-2 md:order-1">
          <div className="max-w-md w-full">
            <p className="text-xs uppercase tracking-widest text-accent mb-3 font-semibold">
              Craftsmanship
            </p>
            <h3
              className="font-bold text-foreground mb-4 leading-tight"
              style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)' }}
            >
              Built to Last.
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">
              Tone-on-tone embroidery. Oversized fit. Premium construction. Every detail matters. Every stitch counts. This is what separates ambitious from ordinary.
            </p>
            <PrimaryButton href="/shop" variant="default">
              Explore Collection
            </PrimaryButton>
          </div>
        </div>

        <div className="relative overflow-hidden order-1 md:order-2" style={{ minHeight: 'clamp(280px, 80vw, 384px)' }}>
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Aug%204%2C%202026%2C%2006_02_50%20PM-xKPpux39mxyPnN7UtMGxh9jI2KSND4.png"
            alt="ZYRØCORE embroidery detail craftsmanship"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </div>

      {/* Fourth: Brown Hoodie Back Detail */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: 'clamp(300px, 60vw, 384px)' }}>
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Aug%204%2C%202026%2C%2005_08_16%20PM-BiZnDdD00gFB05jL3MrkGgZWPyiirA.png"
          alt="ZYRØCORE brown hoodie detail"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-background/90 via-background/50 to-transparent flex items-center justify-end">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 w-full">
            <div className="max-w-[min(28rem,90%)] ml-auto text-right">
              <p className="text-xs uppercase tracking-widest text-accent mb-3 font-semibold">
                Premium Collection
              </p>
              <h2
                className="font-bold text-foreground mb-4 leading-tight"
                style={{ fontSize: 'clamp(1.75rem, 5.5vw, 3.75rem)' }}
              >
                Timeless Hoodie.
              </h2>
              <p
                className="text-muted-foreground mb-6 leading-relaxed hidden sm:block"
                style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.125rem)' }}
              >
                The foundation of your wardrobe. Premium 340 GSM cotton. Tone-on-tone embroidery. Built for ambitious.
              </p>
              <div className="flex justify-end">
                <PrimaryButton href="/shop" variant="default">
                  Shop Now
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Purpose & Craftsmanship Philosophy */}
      <BrandStorySection />
    </section>
  )
}
