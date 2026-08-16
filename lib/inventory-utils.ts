/**
 * Real-time Inventory & Stock Calculation Utilities
 */

export function getAvailableStockForSize(
  productStock: number | string | null | undefined,
  sizeStock: any,
  size: string | null | undefined
): number {
  const overallStock = Math.max(0, Math.floor(Number(productStock) || 0))
  if (overallStock === 0) return 0

  if (!size || !String(size).trim()) return overallStock

  const normTarget = String(size).trim().toUpperCase()

  let sizeMap: Record<string, number> = {}
  if (typeof sizeStock === 'object' && sizeStock !== null) {
    sizeMap = sizeStock
  } else if (typeof sizeStock === 'string') {
    try {
      sizeMap = JSON.parse(sizeStock)
    } catch {
      sizeMap = {}
    }
  }

  const keys = Object.keys(sizeMap)
  if (keys.length === 0) {
    // If size_stock map is not configured or empty, fallback to overall product stock
    return overallStock
  }

  const matchedKey = keys.find(k => String(k).trim().toUpperCase() === normTarget)

  if (matchedKey !== undefined) {
    return Math.max(0, Math.floor(Number(sizeMap[matchedKey]) || 0))
  }

  // If size is requested but not explicitly in size_stock map, fallback to overall product stock
  return overallStock
}
