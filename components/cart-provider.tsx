'use client'

import { createContext, useContext, useMemo, useCallback } from 'react'
import useSWR from 'swr'
import { useAuth } from './auth-provider'

import { safeFetcher } from '@/lib/utils-shop'

interface CartContextType {
  cartCount: number
  refreshCart: () => void
}

const CartContext = createContext<CartContextType>({ cartCount: 0, refreshCart: () => {} })

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { data, mutate: mutateCart } = useSWR(user ? '/api/cart' : null, safeFetcher, { refreshInterval: 0 })

  const cartCount = data?.items?.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0) ?? 0

  const refreshCart = useCallback(() => {
    mutateCart()
  }, [mutateCart])

  const value = useMemo(() => ({
    cartCount,
    refreshCart,
  }), [cartCount, refreshCart])

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
