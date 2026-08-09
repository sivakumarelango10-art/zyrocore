import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/header'
import Footer from '@/components/footer'
import PrivacyPolicyClient from './privacy-policy-client'
import { SITE_CONFIG } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `Privacy Policy — ${SITE_CONFIG.name}`,
  description: `Read the official Privacy Policy for ${SITE_CONFIG.name}. Learn how we collect, protect, and use your personal information.`,
  alternates: {
    canonical: `${SITE_CONFIG.url}/privacy-policy`,
  },
  openGraph: {
    title: `Privacy Policy — ${SITE_CONFIG.name}`,
    description: `Learn how ${SITE_CONFIG.name} collects, protects, and handles your personal information.`,
    url: `${SITE_CONFIG.url}/privacy-policy`,
    siteName: SITE_CONFIG.name,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Privacy Policy — ${SITE_CONFIG.name}`,
    description: `Read our comprehensive Privacy Policy and data protection guidelines at ${SITE_CONFIG.name}.`,
  },
}

export default function PrivacyPolicyPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Privacy Policy — ${SITE_CONFIG.name}`,
    description: `Privacy policy and data protection guidelines for ${SITE_CONFIG.name}.`,
    url: `${SITE_CONFIG.url}/privacy-policy`,
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
        <PrivacyPolicyClient />
      </main>
      <Footer />
    </div>
  )
}
