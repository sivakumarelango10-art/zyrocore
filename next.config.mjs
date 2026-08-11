/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  experimental: {
    // Tree-shake icon libraries — only bundles icons that are actually imported
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Supabase Storage
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'fdtituksbcprvduaskii.supabase.co' },
      // Vercel Blob Storage (production image uploads)
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      // Vercel Blob (legacy pattern)
      { protocol: 'https', hostname: 'blob.vercel-storage.com' },
      // Google user content (profile photos, etc.)
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Unsplash images
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      // Other common image hosts
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      // Local development
      { protocol: 'http', hostname: 'localhost' },
    ],
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com")',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://cdn.razorpay.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://*.razorpay.com https://api.razorpay.com https://checkout.razorpay.com https://*.supabase.co wss://*.supabase.co",
              "frame-src 'self' https://*.razorpay.com https://checkout.razorpay.com https://api.razorpay.com",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig

