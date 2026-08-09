import { Metadata } from 'next'
import Header from '@/components/header'
import Footer from '@/components/footer'
import TermsAndConditionsClient from './terms-and-conditions-client'
import { SITE_CONFIG } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `Terms & Conditions — ${SITE_CONFIG.name}`,
  description: `Official Terms and Conditions for ${SITE_CONFIG.name}. Understand your rights, purchasing guidelines, order terms, and shipping policies.`,
  alternates: {
    canonical: `${SITE_CONFIG.url}/terms-and-conditions`,
  },
  openGraph: {
    title: `Terms & Conditions — ${SITE_CONFIG.name}`,
    description: `Understand the terms governing product orders, shipping, UPI payments, and store policies at ${SITE_CONFIG.name}.`,
    url: `${SITE_CONFIG.url}/terms-and-conditions`,
    siteName: SITE_CONFIG.name,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Terms & Conditions — ${SITE_CONFIG.name}`,
    description: `Official store rules, shipping terms, payment policies, and legal guidelines at ${SITE_CONFIG.name}.`,
  },
}

export default function TermsAndConditionsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Terms & Conditions — ${SITE_CONFIG.name}`,
    description: `Legal terms and conditions governing purchases and usage of ${SITE_CONFIG.name}.`,
    url: `${SITE_CONFIG.url}/terms-and-conditions`,
    publisher: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="flex-1">
        <TermsAndConditionsClient />
      </main>
      <Footer />
    </div>
  )
}
