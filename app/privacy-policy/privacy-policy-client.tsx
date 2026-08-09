'use client'

import { useEffect, useState } from 'react'
import {
  Calendar,
  ShieldCheck,
  Info,
  Database,
  Workflow,
  Lock,
  Cookie,
  Share2,
  UserCheck,
  ExternalLink,
  FileEdit,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  Shield,
} from 'lucide-react'
import { SITE_CONFIG } from '@/lib/site-config'

const sections = [
  { id: 'effective-date', label: 'Effective Date', icon: Calendar },
  { id: 'introduction', label: '1. Introduction', icon: Info },
  { id: 'info-collected', label: '2. Information We Collect', icon: Database },
  { id: 'how-we-use', label: '3. How We Use Info', icon: Workflow },
  { id: 'payment-security', label: '4. Payment Security', icon: Lock },
  { id: 'cookies', label: '5. Cookies & Tracking', icon: Cookie },
  { id: 'sharing', label: '6. Info Sharing', icon: Share2 },
  { id: 'data-security', label: '7. Data Security', icon: ShieldCheck },
  { id: 'user-rights', label: '8. Your Rights', icon: UserCheck },
  { id: 'third-party', label: '9. Third-Party Links', icon: ExternalLink },
  { id: 'changes', label: '10. Policy Changes', icon: FileEdit },
  { id: 'contact-us', label: '11. Contact Us', icon: Mail },
]

export default function PrivacyPolicyClient() {
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
      {/* Header Banner */}
      <div className="bg-card border border-border rounded-2xl p-6 md:p-10 mb-12 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Shield className="w-64 h-64 text-foreground" />
        </div>
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 bg-muted/60 px-3 py-1 rounded-full border border-border">
            <ShieldCheck className="w-3.5 h-3.5" /> Legal & Transparency
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            Privacy Policy
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mt-4 leading-relaxed">
            Your trust is our priority. This policy outlines how ZYRØCORE collects, uses, and safeguards your personal data when browsing or making purchases.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Sticky Desktop Sidebar Table of Contents */}
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

        {/* Main Privacy Policy Content */}
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
              This Privacy Policy is effective as of <strong className="text-foreground">{SITE_CONFIG.effectiveDate}</strong> and applies to all visitors, registered users, and customers of {SITE_CONFIG.name}.
            </p>
          </section>

          {/* Introduction */}
          <section id="introduction" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <Info className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">1. Introduction</h2>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                Welcome to {SITE_CONFIG.name} ("we," "our," or "us"). We respect your privacy and are committed to protecting the personal information you share with us.
              </p>
              <p>
                By accessing our website ({SITE_CONFIG.domain}) or utilizing our services, you consent to the data practices described in this Privacy Policy.
              </p>
            </div>
          </section>

          {/* Information We Collect */}
          <section id="info-collected" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <Database className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">2. Information We Collect</h2>
            </div>
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>We collect information to provide better services to our users. This includes:</p>
              <ul className="space-y-2 list-disc list-inside text-foreground/90">
                <li><strong className="text-foreground">Personal Contact Info:</strong> Full Name, Email Address, Mobile Number.</li>
                <li><strong className="text-foreground">Delivery & Billing Address:</strong> Street, City, State, Pincode, Country.</li>
                <li><strong className="text-foreground">Payment Verification Data:</strong> Transaction UTR numbers or payment confirmation screenshots uploaded during UPI checkout.</li>
                <li><strong className="text-foreground">Technical & Device Data:</strong> IP Address, browser type, device identifiers, and operating system.</li>
              </ul>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section id="how-we-use" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <Workflow className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">3. How We Use Your Information</h2>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>The information we collect is utilized strictly for legitimate business purposes:</p>
              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                  <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Order Fulfillment</h3>
                  <p className="text-xs text-muted-foreground">Processing orders, dispatching shipments, and sending tracking updates.</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                  <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Customer Support</h3>
                  <p className="text-xs text-muted-foreground">Assisting with order inquiries, returns, and technical troubleshooting.</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                  <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Account Management</h3>
                  <p className="text-xs text-muted-foreground">Maintaining your wishlist, order history, and account preferences.</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                  <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Security & Auditing</h3>
                  <p className="text-xs text-muted-foreground">Preventing fraudulent transactions and ensuring system security.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Payment Security */}
          <section id="payment-security" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">4. Payment Security</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All payment verification screenshots uploaded during UPI transactions are stored securely in encrypted storage and accessed exclusively by authorized administrators for audit and order verification purposes.
            </p>
          </section>

          {/* Cookies */}
          <section id="cookies" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <Cookie className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">5. Cookies & Tracking Technologies</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use essential cookies and session tokens to keep you logged in, save items in your shopping cart, and maintain seamless site performance.
            </p>
          </section>

          {/* Information Sharing */}
          <section id="sharing" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <Share2 className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">6. Information Sharing</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">We never sell, rent, or trade your personal information.</strong> Data is shared only with trusted third-party service providers (such as logistics partners for shipping) required to complete your transactions.
            </p>
          </section>

          {/* Data Security */}
          <section id="data-security" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">7. Data Security</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We employ strict industry-standard technical measures, including HTTPS encryption, parameterized queries, and secure database connections to protect your data.
            </p>
          </section>

          {/* Your Rights */}
          <section id="user-rights" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <UserCheck className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">8. Your Rights</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You have the right to access, update, or request deletion of your personal data at any time by contacting our support team.
            </p>
          </section>

          {/* Third-Party Links */}
          <section id="third-party" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <ExternalLink className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">9. Third-Party Links</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our website may contain links to external sites. We are not responsible for the privacy practices or content of third-party websites.
            </p>
          </section>

          {/* Changes */}
          <section id="changes" className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-28">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-muted text-foreground">
                <FileEdit className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">10. Changes to This Policy</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We reserve the right to update this policy as our practices evolve. Any changes will be posted on this page with an updated effective date.
            </p>
          </section>

          {/* Contact Us Block */}
          <section id="contact-us" className="bg-card border-2 border-foreground/20 rounded-2xl p-6 md:p-8 shadow-md scroll-mt-28">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-foreground text-background">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">11. Contact Us</h2>
                <p className="text-xs text-muted-foreground">Have privacy questions or data requests?</p>
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
