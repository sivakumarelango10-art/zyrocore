import Link from 'next/link'
import ZyrocoreLogo from './zyrocore-logo'
import { SITE_CONFIG } from '@/lib/site-config'

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-12 md:mt-20">
      <div className="max-w-7xl mx-auto px-4 py-10 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 md:mb-6">
              <div className="text-accent">
                <ZyrocoreLogo showTagline size="sm" />
              </div>
            </Link>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Built for Ambitious. Premium clothing and accessories for those who refuse to follow trends.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-xs mb-3 md:mb-4 text-foreground uppercase tracking-widest">Shop</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li><Link href="/products" className="hover:text-foreground transition-colors py-0.5 block">All Products</Link></li>
              <li><Link href="/products?category=formals" className="hover:text-foreground transition-colors py-0.5 block">Formals</Link></li>
              <li><Link href="/products?category=casuals" className="hover:text-foreground transition-colors py-0.5 block">Casuals</Link></li>
              <li><Link href="/products?category=party-wear" className="hover:text-foreground transition-colors py-0.5 block">Party Wear</Link></li>
              <li><Link href="/products?category=premium-collection" className="hover:text-foreground transition-colors py-0.5 block">Premium</Link></li>
              <li><Link href="/products?category=new-arrivals" className="hover:text-foreground transition-colors py-0.5 block">New Arrivals</Link></li>
              <li><Link href="/products?best_seller=true" className="hover:text-foreground transition-colors py-0.5 block">Best Sellers</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-xs mb-3 md:mb-4 text-foreground uppercase tracking-widest">Account</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li><Link href="/account" className="hover:text-foreground transition-colors py-0.5 block">My Account</Link></li>
              <li><Link href="/orders" className="hover:text-foreground transition-colors py-0.5 block">My Orders</Link></li>
              <li><Link href="/wishlist" className="hover:text-foreground transition-colors py-0.5 block">Wishlist</Link></li>
              <li><Link href="/cart" className="hover:text-foreground transition-colors py-0.5 block">Cart</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-xs mb-3 md:mb-4 text-foreground uppercase tracking-widest">Help & Legal</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li><Link href="/privacy-policy" className="hover:text-foreground transition-colors py-0.5 block">Privacy Policy</Link></li>
              <li><Link href="/terms-and-conditions" className="hover:text-foreground transition-colors py-0.5 block">Terms & Conditions</Link></li>
              <li><Link href="/terms-and-conditions#shipping" className="hover:text-foreground transition-colors py-0.5 block">Shipping Policy</Link></li>
              <li><Link href="/returns" className="hover:text-foreground transition-colors py-0.5 block">Return Policy</Link></li>
              <li><Link href="/story#contact" className="hover:text-foreground transition-colors py-0.5 block">Our Story & Contact</Link></li>
              <li><a href={SITE_CONFIG.mailtoInquiry} className="hover:text-foreground transition-colors py-0.5 block break-all">Email Us</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 md:mt-12 pt-6 md:pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] sm:text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ZYRØCORE. Built for Ambitious.</p>
          <div className="flex gap-4 sm:gap-6">
            <Link href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms-and-conditions" className="hover:text-foreground transition-colors">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
