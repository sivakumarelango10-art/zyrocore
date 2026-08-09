'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import type { AuthUser } from '@/lib/types'

interface AdminAuthCtx {
  user: AuthUser | null
  loading: boolean
  logout: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthCtx>({ user: null, loading: true, logout: async () => {} })

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data?.user ?? null))
      .finally(() => setLoading(false))
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    window.location.href = '/login?from=/secure-admin'
  }, [])

  const value = useMemo(() => ({ user, loading, logout }), [user, loading, logout])

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export const useAdminAuth = () => useContext(AdminAuthContext)
