// Cached formatter instances — constructing Intl objects is expensive;
// instantiate once at module level and reuse across all calls.
const priceFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

export function formatPrice(price: number): string {
  return priceFormatter.format(price)
}

export function formatDate(date: string): string {
  return dateFormatter.format(new Date(date))
}

export function calculateDiscount(price: number, discountPrice: number): number {
  return Math.round(((price - discountPrice) / price) * 100)
}

export function getOrderStatusColor(status: string): string {
  switch (status) {
    case 'pending':   return 'bg-yellow-100 text-yellow-800'
    case 'confirmed': return 'bg-blue-100 text-blue-800'
    case 'shipped':   return 'bg-indigo-100 text-indigo-800'
    case 'delivered': return 'bg-green-100 text-green-800'
    case 'cancelled': return 'bg-red-100 text-red-800'
    default:          return 'bg-gray-100 text-gray-800'
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function safeParseJson(res: Response): Promise<any> {
  try {
    const text = await res.text()
    if (!text || !text.trim()) return {}
    return JSON.parse(text)
  } catch {
    return {}
  }
}

export const safeFetcher = async (url: string): Promise<any> => {
  try {
    const res = await fetch(url)
    return await safeParseJson(res)
  } catch {
    return null
  }
}
