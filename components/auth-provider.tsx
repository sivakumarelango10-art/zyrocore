'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import type { AuthUser } from '@/lib/types'

import { safeParseJson } from '@/lib/utils-shop'

import { createClient } from '@/utils/supabase/client'

interface LoginResult {
  error?: string
  user?: AuthUser
  redirectTo?: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  loginWithGoogle: (returnTo?: string) => Promise<{ error?: string }>
  register: (name: string, email: string, password: string, phone?: string) => Promise<{ error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await safeParseJson(res)
      setUser(data?.user ?? null)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await safeParseJson(res)
    if (!res.ok) return { error: data?.error || 'Login failed' }
    setUser(data.user)
    return { user: data.user, redirectTo: data.redirectTo }
  }, [])

  const loginWithGoogle = useCallback(async (returnTo?: string) => {
    try {
      const supabase = createClient()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const redirectUrl = new URL('/auth/callback', origin)
      if (returnTo) redirectUrl.searchParams.set('next', returnTo)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl.toString(),
        },
      })
      if (error) return { error: error.message }
      return {}
    } catch (err: any) {
      return { error: err?.message || 'Failed to initiate Google sign in' }
    }
  }, [])

  const register = useCallback(async (name: string, email: string, password: string, phone?: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone }),
    })
    const data = await safeParseJson(res)
    if (!res.ok) return { error: data?.error || 'Registration failed' }
    setUser(data.user)
    return {}
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Non-fatal
    }
    setUser(null)
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    login,
    loginWithGoogle,
    register,
    logout,
    refreshUser,
  }), [user, loading, login, loginWithGoogle, register, logout, refreshUser])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
