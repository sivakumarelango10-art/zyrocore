'use client'

import { useEffect } from 'react'
import { useSWRConfig } from 'swr'
import { createClient } from '@/utils/supabase/client'

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { mutate } = useSWRConfig()

  useEffect(() => {
    const supabase = createClient()

    // Function to revalidate all core data
    const refreshAll = () => {
      mutate((key) => typeof key === 'string' && key.startsWith('/api/products'))
      mutate((key) => typeof key === 'string' && key.startsWith('/api/cart'))
      mutate((key) => typeof key === 'string' && key.startsWith('/api/orders'))
      mutate((key) => typeof key === 'string' && key.startsWith('/api/admin/inventory'))
      mutate((key) => typeof key === 'string' && key.startsWith('/api/admin/orders'))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zyrocore-realtime-update'))
      }
    }

    // Subscribe to Supabase Realtime database changes
    const channel = supabase
      .channel('zyrocore-db-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          refreshAll()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          refreshAll()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cart_items' },
        () => {
          refreshAll()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [mutate])

  return <>{children}</>
}
