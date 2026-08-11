import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/components/auth-provider'
import { CartProvider } from '@/components/cart-provider'
import dynamic from 'next/dynamic'
import './globals.css'

const InstagramFloat = dynamic(() => import('@/components/instagram-float'))

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace('://zyrocore.in', '://www.zyrocore.in')
      : 'https://www.zyrocore.in'
  ),
  title: 'ZYRØCORE — Built for Ambitious',
  description: 'ZYRØCORE delivers premium clothing, activewear, and timeless fashion for the ambitious. Discover handcrafted apparel designed for performance and everyday style.',
  alternates: {
    canonical: 'https://www.zyrocore.in/',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: dark)' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'ZYRØCORE — Built for Ambitious',
    description: 'ZYRØCORE delivers premium clothing, activewear, and timeless fashion for the ambitious. Discover handcrafted apparel designed for performance and everyday style.',
    url: 'https://www.zyrocore.in/',
    siteName: 'ZYRØCORE',
    images: [
      {
        url: '/logo-emblem.png',
        width: 708,
        height: 615,
        alt: 'ZYRØCORE Official Emblem Logo',
      },
    ],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#000000' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://www.zyrocore.in/#organization',
      name: 'ZYRØCORE',
      url: 'https://www.zyrocore.in/',
      logo: 'https://www.zyrocore.in/logo-emblem.png',
      sameAs: ['https://www.instagram.com/zyrocore.official/'],
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+91-63698-63301',
        contactType: 'customer service',
        email: 'bpzyrocore@gmail.com',
      },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.zyrocore.in/#website',
      url: 'https://www.zyrocore.in/',
      name: 'ZYRØCORE',
      description: 'Built for Ambitious. Discover premium clothing, activewear, and accessories at ZYRØCORE.',
      publisher: {
        '@id': 'https://www.zyrocore.in/#organization',
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://www.zyrocore.in/products?search={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fdtituksbcprvduaskii.supabase.co" crossOrigin="anonymous" />
        <link
          rel="preload"
          as="image"
          href="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/product2-MrjpbiVDhc1Nnt7rEHuFQpWG0mjnmu.png"
          // @ts-ignore fetchpriority is valid HTML attribute
          fetchpriority="high"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} font-sans antialiased bg-background text-foreground`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground focus:outline-none focus:ring-2 focus:ring-accent border border-border rounded-md m-2"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <CartProvider>
            {children}
            <InstagramFloat />
            <Toaster position="bottom-right" />
          </CartProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
