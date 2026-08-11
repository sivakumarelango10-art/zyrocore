import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.zyrocore.in'
  if (baseUrl.includes('://zyrocore.in')) {
    baseUrl = baseUrl.replace('://zyrocore.in', '://www.zyrocore.in')
  }
  baseUrl = baseUrl.replace(/\/$/, '')

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
