'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Package, PackagePlus, ShoppingBag,
  Layers, BarChart2, FileText, Users, LogOut, Bell, ChevronRight, Menu, X, QrCode, User,
} from 'lucide-react'
import { useAdminAuth } from './admin-auth-provider'
import { useState } from 'react'
import ZyrocoreLogo from '@/components/zyrocore-logo'

const NAV = [
  { href: '/secure-admin',            label: 'Dashboard',   icon: LayoutDashboard, exact: true },
  { href: '/secure-admin/products',   label: 'Products',    icon: Package,         exact: false },
  { href: '/secure-admin/products/new', label: 'Add Product', icon: PackagePlus,   exact: false },
  { href: '/secure-admin/orders',     label: 'Orders',      icon: ShoppingBag,     exact: false },
  { href: '/secure-admin/customers',  label: 'Customers',   icon: Users,           exact: false },
  { href: '/secure-admin/inventory',  label: 'Inventory',   icon: Layers,          exact: false },
  { href: '/secure-admin/analytics',  label: 'Analytics',   icon: BarChart2,       exact: false },
  { href: '/secure-admin/reports',    label: 'Reports',     icon: FileText,        exact: false },
  { href: '/secure-admin/payment-settings', label: 'Payments', icon: QrCode,        exact: false },
  { href: '/secure-admin/profile',    label: 'Profile',     icon: User,            exact: false },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  // Consume auth from shared context — no duplicate API call
  const { user, loading: checking, logout } = useAdminAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Redirect unauthenticated or non-admin users
  if (!checking && (!user || user.role !== 'admin')) {
    router.replace('/login?from=/secure-admin')
    return null
  }

  const handleLogout = async () => {
    await logout()
    // logout() in AdminAuthProvider handles redirect + token clearing
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const Sidebar = () => (
    <aside className="w-56 bg-black flex flex-col min-h-screen flex-shrink-0">
      {/* Brand */}
      <div className="h-14 flex items-center px-4 border-b border-neutral-800">
        <ZyrocoreLogo size="sm" className="text-white" />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-neutral-900 text-white font-medium'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-neutral-800 space-y-2">
        <button
          onClick={handleLogout}
          suppressHydrationWarning
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:text-red-400 hover:bg-neutral-900 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
        {user && (
          <Link
            href="/secure-admin/profile"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-900 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-black text-xs font-bold flex-shrink-0 overflow-hidden border border-neutral-700">
              {user.avatar_url ? (
                <Image src={user.avatar_url} alt={user.name} width={28} height={28} unoptimized className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white font-medium truncate">{user.name}</p>
              <p className="text-[10px] text-neutral-500 truncate">{user.email}</p>
            </div>
          </Link>
        )}
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-neutral-50 flex font-sans text-neutral-900">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-56">
            <Sidebar />
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-neutral-200 flex items-center px-4 lg:px-6 gap-4 flex-shrink-0">
          <button
            className="lg:hidden text-neutral-500 hover:text-black"
            onClick={() => setMobileOpen(v => !v)}
            suppressHydrationWarning
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Breadcrumb path */}
          <div className="flex items-center gap-1.5 text-sm text-neutral-400 flex-1 min-w-0">
            <span className="text-black font-semibold">Admin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-neutral-600 font-medium truncate capitalize">
              {pathname.replace('/secure-admin', '').replace(/^\//, '') || 'Dashboard'}
            </span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <button
              suppressHydrationWarning
              aria-label="Notifications"
              className="relative w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:text-black hover:bg-neutral-100 transition-colors"
            >
              <Bell className="w-4 h-4" />
            </button>
            {user && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm text-neutral-700 font-medium">{user.name}</span>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

