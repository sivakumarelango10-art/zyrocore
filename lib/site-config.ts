export const SITE_CONFIG = {
  name: 'ZYRØCORE',
  tagline: 'Built for Ambitious',
  domain: 'www.zyrocore.in',
  url: 'https://www.zyrocore.in',
  supportEmail: 'bpzyrocore@gmail.com',
  emailPlaceholder: 'bpzyrocore@gmail.com',
  phone: '+91 63698 63301',
  phoneClean: '+916369863301',
  address: 'Tamil Nadu, India',
  effectiveDate: 'August 5, 2026',
  businessHours: 'Mon - Sat: 9:00 AM - 8:00 PM IST',
  supportHours: '24/7 Online Customer Support',
  responseTime: 'Under 2 hours guaranteed',
  returnsEnabled: false,
  returnPolicyTitle: 'Returns Currently Unavailable',
  returnPolicyMessage: 'Returns are currently unavailable. Please contact our support team if you need assistance with your order.',
  social: {
    instagram: 'https://www.instagram.com/zyrocore.official/',
    instagramDm: 'https://ig.me/m/zyrocore.official',
    instagramHandle: '@zyrocore.official',
  },
  mailtoInquiry: 'mailto:bpzyrocore@gmail.com?subject=Website%20Inquiry%20%E2%80%93%20ZYR%C3%98CORE',
}

export function openInstagramDm() {
  if (typeof window === 'undefined') return

  // Direct DM URL opens directly in Instagram Direct Message chat
  const dmUrl = SITE_CONFIG.social.instagramDm
  window.open(dmUrl, '_blank', 'noopener,noreferrer')
}
