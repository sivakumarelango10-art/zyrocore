import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zyrocore.in'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/secure-admin/',
        '/api/',
        '/account/',
        '/cart/',
        '/checkout/',
        '/orders/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
