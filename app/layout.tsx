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
  description: 'Built for Ambitious. Discover premium clothing, activewear, and accessories at ZYRØCORE.',
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
    description: 'Built for Ambitious. Discover premium clothing, activewear, and accessories at ZYRØCORE.',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fdtituksbcprvduaskii.supabase.co" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} font-sans antialiased bg-background text-foreground`}>
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
