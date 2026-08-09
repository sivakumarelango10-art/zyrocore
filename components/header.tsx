'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useId, useRef } from 'react'
import { Search, ShoppingCart, Heart, User, Menu, X, ChevronDown, Compass, PhoneCall, LogOut, Package, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import ZyrocoreLogo from './zyrocore-logo'
import { useAuth } from './auth-provider'
import { useCart } from './cart-provider'
import { SITE_CONFIG } from '@/lib/site-config'

const mainNav = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/shop' },
  { label: 'Journey', href: '/story#journey' },
  { label: 'Contact', href: '/story#contact' },
]

export default function Header() {
  const { user, logout } = useAuth()
  const { cartCount } = useCart()
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null)
  const mobileDrawerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const mobileDrawerTitleId = useId()

  const getDrawerFocusables = () => {
    const elements = mobileDrawerRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    return Array.from(elements || []).filter(element => !element.hasAttribute('disabled'))
  }

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  // Close drawer when route changes or ESC is pressed
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (mobileOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null
      requestAnimationFrame(() => {
        const focusables = getDrawerFocusables()
        ;(focusables[0] || mobileDrawerRef.current)?.focus()
      })
      return
    }

    previousFocusRef.current?.focus?.()
  }, [mobileOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) {
      router.push(`/products?search=${encodeURIComponent(search.trim())}`)
      setSearch('')
      setMobileOpen(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    setMobileOpen(false)
    router.push('/')
  }

  const handleDrawerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setMobileOpen(false)
      return
    }

    if (e.key !== 'Tab') return

    const focusables = getDrawerFocusables()
    if (focusables.length === 0) {
      e.preventDefault()
      return
    }

    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement

    if (e.shiftKey && active === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const [currentHash, setCurrentHash] = useState('')

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(typeof window !== 'undefined' ? window.location.hash || '' : '')
    }
    handleHashChange()

    window.addEventListener('hashchange', handleHashChange)
    window.addEventListener('popstate', handleHashChange)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      window.removeEventListener('popstate', handleHashChange)
    }
  }, [pathname])

  const isNavActive = (href: string) => {
    const [basePath, targetHash] = href.split('#')
    const hasHash = Boolean(targetHash)

    if (basePath === '/') {
      return pathname === '/'
    }

    const matchesPath = pathname === basePath || pathname.startsWith(basePath + '/')
    if (!matchesPath) return false

    if (hasHash) {
      if (targetHash === 'journey') {
        return currentHash === '#journey' || !currentHash || currentHash === '#'
      }
      return currentHash === `#${targetHash}`
    }

    return !currentHash || currentHash === '#'
  }

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      {/* Top bar */}
      <div className="bg-accent text-accent-foreground py-2 text-center text-xs font-medium tracking-widest uppercase">
        Free shipping on orders over ₹999
      </div>

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center gap-4 sm:gap-6">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 flex items-center">
          <ZyrocoreLogo size="md" />
        </Link>

        {/* Desktop Search */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clothing, activewear..."
              className="pl-9 h-10 bg-muted/50 border-border focus-visible:ring-1"
            />
          </div>
        </form>

        {/* Nav actions */}
        <nav className="flex items-center gap-1.5 ml-auto">
          {/* Wishlist */}
          <Button variant="ghost" size="icon" asChild className="hidden md:flex">
            <Link href={user ? '/wishlist' : '/login'} aria-label="Wishlist">
              <Heart className="w-5 h-5" />
            </Link>
          </Button>

          {/* Cart */}
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/cart" aria-label="Cart">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-foreground text-background rounded-full font-mono font-bold">
                  {cartCount > 99 ? '99+' : cartCount}
                </Badge>
              )}
            </Link>
          </Button>

          {/* Desktop User Dropdown */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hidden md:flex items-center gap-1.5 h-9 px-3">
                  <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm max-w-[90px] truncate font-medium">{user.name.split(' ')[0]}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/account">My Account</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/orders">My Orders</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/wishlist">Wishlist</Link>
                </DropdownMenuItem>
                {/* Admin Dashboard link intentionally omitted from public UI */}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Sign Up</Link>
              </Button>
            </div>
          )}

          {/* Synchronized Mobile menu toggle button (Visible on all viewports < 768px, 44px+ touch hitbox) */}
          <Button
            ref={mobileMenuTriggerRef}
            variant="ghost"
            size="icon"
            className="md:hidden relative z-50 text-foreground hover:bg-muted/60 h-11 w-11 active:scale-95"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </nav>
      </div>

      {/* Main Desktop Sub-Header Navigation */}
      <div className="hidden md:block border-t border-border bg-background/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center justify-center gap-12 h-12 text-xs uppercase tracking-widest" aria-label="Main Navigation">
            {mainNav.map(item => {
              const active = isNavActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    const [, targetHash] = item.href.split('#')
                    setCurrentHash(targetHash ? `#${targetHash}` : '')
                  }}
                  className={`transition-colors font-semibold py-1 relative ${
                    active ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Premium Slide-Over Mobile Drawer & High Z-Index Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex justify-end">
          {/* High performance dark overlay without heavy GPU backdrop blur */}
          <div
            className="fixed inset-0 bg-black/80 transition-opacity animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over Menu Panel with iPhone Safe-Area Insets */}
          <div
            ref={mobileDrawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={mobileDrawerTitleId}
            tabIndex={-1}
            onKeyDown={handleDrawerKeyDown}
            className="relative w-[85%] max-w-sm h-full bg-card border-l border-border z-50 p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col justify-between overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300 outline-none"
          >
            <div className="space-y-6">
              {/* Header inside drawer */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <h2 id={mobileDrawerTitleId} className="sr-only">Navigation menu</h2>
                <Link href="/" onClick={() => setMobileOpen(false)}>
                  <ZyrocoreLogo size="sm" />
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2.5 rounded-full hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors h-11 w-11 flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Mobile Search Input */}
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="pl-9 h-11 bg-muted/40 border-border text-sm"
                />
              </form>

              {/* Main Navigation Links */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-2">
                  Navigation
                </p>
                <nav className="space-y-1">
                  {mainNav.map(item => {
                    const active = isNavActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          setMobileOpen(false)
                          const [, targetHash] = item.href.split('#')
                          setCurrentHash(targetHash ? `#${targetHash}` : '')
                        }}
                        className={`flex items-center justify-between px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
                          active
                            ? 'bg-foreground text-background shadow-sm'
                            : 'text-foreground hover:bg-muted/60'
                        }`}
                      >
                        <span>{item.label}</span>
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-background" />}
                      </Link>
                    )
                  })}
                </nav>
              </div>

              {/* Account & Shopping Quick Actions */}
              <div className="space-y-1 pt-2 border-t border-border">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-2">
                  Account & Orders
                </p>
                <div className="space-y-1">
                  <Link
                    href="/cart"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-muted/60 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <ShoppingCart className="w-4 h-4 text-muted-foreground" /> Cart
                    </span>
                    {cartCount > 0 && (
                      <Badge className="bg-foreground text-background font-mono font-bold text-xs px-2 py-0.5">
                        {cartCount}
                      </Badge>
                    )}
                  </Link>

                  <Link
                    href="/wishlist"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-muted/60 transition-colors"
                  >
                    <Heart className="w-4 h-4 text-muted-foreground" /> Wishlist
                  </Link>

                  {user ? (
                    <>
                      <Link
                        href="/account"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-muted/60 transition-colors"
                      >
                        <UserCheck className="w-4 h-4 text-muted-foreground" /> My Account
                      </Link>
                      <Link
                        href="/orders"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-muted/60 transition-colors"
                      >
                        <Package className="w-4 h-4 text-muted-foreground" /> My Orders
                      </Link>
                      {/* Admin Dashboard link intentionally omitted from public UI */}
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button variant="outline" size="sm" asChild onClick={() => setMobileOpen(false)}>
                        <Link href="/login">Sign In</Link>
                      </Button>
                      <Button size="sm" asChild onClick={() => setMobileOpen(false)}>
                        <Link href="/register">Sign Up</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer inside drawer */}
            <div className="pt-6 border-t border-border space-y-3">
              {user && (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-semibold transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              )}

              <div className="text-[11px] text-muted-foreground text-center space-y-0.5">
                <p><strong className="text-foreground">{SITE_CONFIG.name}</strong> · {SITE_CONFIG.tagline}</p>
                <p>Support: {SITE_CONFIG.phone}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
