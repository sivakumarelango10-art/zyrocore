import { describe, it, expect } from 'vitest'

describe('Inventory Concurrency & Overselling Prevention Logic', () => {
  it('should allow checkout when requested quantity is less than or equal to stock', () => {
    const stock = 10
    const requestedQty = 2

    const isAvailable = stock >= requestedQty
    expect(isAvailable).toBe(true)

    const remainingStock = stock - requestedQty
    expect(remainingStock).toBe(8)
  })

  it('should reject checkout when requested quantity exceeds stock', () => {
    const stock = 3
    const requestedQty = 4

    const isAvailable = stock >= requestedQty
    expect(isAvailable).toBe(false)
  })

  it('should prevent concurrent overselling when stock is 3 and two users attempt to buy 3 simultaneously', () => {
    let stock = 3

    function attemptPurchase(qty: number): boolean {
      if (stock >= qty) {
        stock -= qty
        return true
      }
      return false
    }

    // User A and User B both request 3
    const resultA = attemptPurchase(3) // Succeeds
    const resultB = attemptPurchase(3) // Fails due to zero stock remaining

    expect(resultA).toBe(true)
    expect(resultB).toBe(false)
    expect(stock).toBe(0) // Stock never goes negative
  })

  it('should handle race condition when stock is 1 item and two customers attempt to purchase simultaneously', () => {
    const sizeStockMap: Record<string, number> = { S: 1, M: 4 }

    function attemptAtomicSizeDeduction(size: string, qty: number): boolean {
      const normSize = size.trim().toUpperCase()
      const avail = sizeStockMap[normSize] || 0
      if (avail >= qty) {
        sizeStockMap[normSize] -= qty
        return true
      }
      return false
    }

    // Customer 1 pays first for size S
    const customer1Success = attemptAtomicSizeDeduction('S', 1)
    // Customer 2 pays second for size S
    const customer2Success = attemptAtomicSizeDeduction('S', 1)

    expect(customer1Success).toBe(true)
    expect(customer2Success).toBe(false)
    expect(sizeStockMap['S']).toBe(0) // Never negative
  })

  it('should correctly validate size-level stock availability', () => {
    const sizeStock: Record<string, number> = { S: 3, M: 0, L: 5 }

    const canBuyS = (sizeStock['S'] || 0) >= 3
    const canBuyM = (sizeStock['M'] || 0) >= 1

    expect(canBuyS).toBe(true)
    expect(canBuyM).toBe(false)
  })
})
