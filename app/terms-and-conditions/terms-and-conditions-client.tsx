'use client'

import { useEffect, useState } from 'react'
import {
  Calendar,
  FileText,
  ShoppingBag,
  Tag,
  PackageCheck,
  CreditCard,
  Truck,
  RotateCcw,
  ShieldAlert,
  Scale,
  UserX,
  Gavel,
  FileEdit,
  Mail,
  Phone,
  MapPin,
  Shield,
} from 'lucide-react'
import { SITE_CONFIG } from '@/lib/site-config'

const sections = [
  { id: 'effective-date', label: 'Effective Date', icon: Calendar },
  { id: 'products', label: '1. Products', icon: ShoppingBag },
  { id: 'pricing', label: '2. Pricing', icon: Tag },
  { id: 'orders', label: '3. Orders', icon: PackageCheck },
  { id: 'payments', label: '4. Payments', icon: CreditCard },
  { id: 'shipping', label: '5. Shipping Policy', icon: Truck },
  { id: 'returns', label: '6. Returns & Exchanges', icon: RotateCcw },
  { id: 'intellectual-property', label: '7. Intellectual Property', icon: ShieldAlert },
  { id: 'limitation-of-liability', label: '8. Liability Limitation', icon: Scale },
  { id: 'user-conduct', label: '9. User Conduct', icon: UserX },
  { id: 'governing-law', label: '10. Governing Law', icon: Gavel },
  { id: 'changes', label: '11. Modifications', icon: FileEdit },
  { id: 'contact', label: '12. Contact Info', icon: Mail },
]

export default function TermsAndConditionsClient() {
  const [activeSection, setActiveSection] = useState('effective-date')

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 180
      for (const section of sections) {
        const el = document.getElementById(section.id)
        if (el) {
          const top = el.offsetTop
          const height = el.offsetHeight
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    setActiveSection(id)
    const el = document.getElementById(id)
    if (el) {
      const yOffset = -100
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 lg:py-16">
      {/* Banner */}
      <div className="bg-card border border-border rounded-2xl p-6 md:p-10 mb-12 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <FileText className="w-64 h-64 text-foreground" />
        </div>
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 bg-muted/60 px-3 py-1 rounded-full border border-border">
            <Shield className="w-3.5 h-3.5" /> Terms of Service
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            Terms & Conditions
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mt-4 leading-relaxed">
            Welcome to {SITE_CONFIG.name}. Please review these Terms and Conditions carefully before purchasing items or accessing our platform.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Sticky Desktop TOC Sidebar */}
        <aside className="hidden lg:block lg:col-span-1">
          <div className="sticky top-28 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-2">
              On this page
            </p>
            <nav className="space-y-1" aria-label="Table of Contents">
              {sections.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all text-left ${
                    activeSection === id
                      ? 'bg-foreground text-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Terms Content */}
        <div className="lg:col-span-3 space-y-10">
          {/* Effective Date */}
          <section id="effective-date" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <Calendar className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Effective Date</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              These Terms & Conditions are effective as of <strong className="text-foreground">{SITE_CONFIG.effectiveDate}</strong> and govern all purchases made at {SITE_CONFIG.name}.
            </p>
          </section>

          {/* 1. Products */}
          <section id="products" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">1. Products</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We make every effort to display the colors, fabrics, and details of our products accurately. All product specifications, sizing guides, and descriptions are subject to change without prior notice.
            </p>
          </section>

          {/* 2. Pricing */}
          <section id="pricing" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <Tag className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">2. Pricing</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All prices listed on our website are in Indian Rupees (INR) and include applicable taxes. We reserve the right to correct pricing errors or modify prices at any time prior to order confirmation.
            </p>
          </section>

          {/* 3. Orders */}
          <section id="orders" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <PackageCheck className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">3. Orders</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              An order confirmation does not signify automatic acceptance. We reserve the right to limit quantities, reject orders, or cancel transactions due to inventory shortages or fraud suspicion.
            </p>
          </section>

          {/* 4. Payments */}
          <section id="payments" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <CreditCard className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">4. Payments</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We accept payments via UPI QR Code and VPA transfers. Orders are processed upon successful payment verification by our team. Submitting altered or fraudulent screenshots will result in immediate order cancellation and account suspension.
            </p>
          </section>

          {/* 5. Shipping */}
          <section id="shipping" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <Truck className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">5. Shipping & Delivery</h2>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                Orders are dispatched within 24–48 business hours. We offer <strong className="text-foreground">Free Shipping on orders over ₹999</strong> across India. Standard orders incur a ₹99 delivery fee.
              </p>
              <p>
                Delivery timelines typically range between 3 to 7 business days depending on destination logistics.
              </p>
            </div>
          </section>

          {/* 6. Returns & Exchanges */}
          <section id="returns" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">6. Returns & Exchanges</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {SITE_CONFIG.returnsEnabled ? (
                <>We offer a <strong className="text-foreground">15-day hassle-free return and exchange policy</strong> for unworn, unwashed products with original tags attached.</>
              ) : (
                <strong className="text-foreground">{SITE_CONFIG.returnPolicyMessage}</strong>
              )}
            </p>
          </section>

          {/* 7. Intellectual Property */}
          <section id="intellectual-property" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">7. Intellectual Property</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All branding, logos, imagery, typography, and website content are the exclusive intellectual property of {SITE_CONFIG.name}. Unauthorized reproduction or commercial use is strictly prohibited.
            </p>
          </section>

          {/* 8. Limitation of Liability */}
          <section id="limitation-of-liability" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <Scale className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">8. Limitation of Liability</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To the maximum extent permitted by applicable law, {SITE_CONFIG.name} shall not be liable for indirect, incidental, or consequential damages resulting from product use or site downtime.
            </p>
          </section>

          {/* 9. User Conduct */}
          <section id="user-conduct" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <UserX className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">9. User Conduct</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Users agree not to exploit site vulnerabilities, upload malicious code, or engage in unauthorized data scraping.
            </p>
          </section>

          {/* 10. Governing Law */}
          <section id="governing-law" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <Gavel className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">10. Governing Law</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              These terms are governed by and construed in accordance with the laws of India. Any legal disputes shall be subject to the exclusive jurisdiction of the courts in Tamil Nadu, India.
            </p>
          </section>

          {/* 11. Changes */}
          <section id="changes" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <FileEdit className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">11. Modifications</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms & Conditions at any time. Continued use of our site after updates constitutes acceptance of the new terms.
            </p>
          </section>

          {/* 12. Contact */}
          <section id="contact" className="bg-card border-2 border-foreground/20 rounded-2xl p-6 md:p-8 shadow-md scroll-mt-28">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-foreground text-background">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">12. Contact Information</h2>
                <p className="text-xs text-muted-foreground">For legal or store terms inquiries</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 pt-2 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground text-xs uppercase tracking-wider">Email</p>
                  <p className="text-muted-foreground mt-0.5">{SITE_CONFIG.supportEmail || SITE_CONFIG.emailPlaceholder}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground text-xs uppercase tracking-wider">Phone</p>
                  <p className="text-muted-foreground mt-0.5">{SITE_CONFIG.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground text-xs uppercase tracking-wider">Address</p>
                  <p className="text-muted-foreground mt-0.5">{SITE_CONFIG.address}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border/60 text-xs text-muted-foreground">
              <strong className="text-foreground">{SITE_CONFIG.name}</strong> · {SITE_CONFIG.tagline}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
