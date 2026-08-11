'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import type { AuthUser } from '@/lib/types'

interface AdminAuthCtx {
  user: AuthUser | null
  loading: boolean
  logout: () => Promise<void>
  refetch: () => Promise<void>
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>
}

const AdminAuthContext = createContext<AdminAuthCtx>({
  user: null,
  loading: true,
  logout: async () => {},
  refetch: async () => {},
  setUser: () => {},
})

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/me')
      if (r.ok) {
        const data = await r.json()
        setUser(data?.user ?? null)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    window.location.href = '/login?from=/secure-admin'
  }, [])

  const value = useMemo(() => ({ user, loading, logout, refetch: fetchUser, setUser }), [user, loading, logout, fetchUser])

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export const useAdminAuth = () => useContext(AdminAuthContext)
