'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
  Package, Heart, ShoppingCart, User, LogOut, Edit3, MapPin, Phone,
  Mail, Key, Save, X, Shield, ChevronRight, Loader2
} from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatPrice, formatDate, getOrderStatusColor, safeFetcher, safeParseJson } from '@/lib/utils-shop'
import { useAuth } from '@/components/auth-provider'
import { getCurrentLocationAddress } from '@/lib/google-maps'
import { toast } from 'sonner'
import type { Order } from '@/lib/types'

export default function AccountPage() {
  const { user, logout, refreshUser } = useAuth()
  const router = useRouter()
  const { data } = useSWR(user ? '/api/orders' : null, safeFetcher)
  const orders: Order[] = (data?.orders ?? []).slice(0, 3)

  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    newPassword: '',
  })

  // Sync state when user is loaded or updated
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        zip: user.zip || '',
        newPassword: '',
      })
    }
  }, [user])

  const handleUseLocation = async () => {
    setLocating(true)
    const toastId = toast.loading('Detecting your GPS location...')
    try {
      const geo = await getCurrentLocationAddress()
      setFormData(prev => ({
        ...prev,
        address: geo.address || prev.address,
        city: geo.city || prev.city,
        state: geo.state || prev.state,
        zip: geo.pincode || prev.zip,
      }))
      toast.success('Address filled from your location!', { id: toastId })
    } catch (err: any) {
      toast.error(err.message || 'Failed to detect location', { id: toastId })
    } finally {
      setLocating(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await safeParseJson(res)
      if (!res.ok) throw new Error(data?.error || 'Failed to update profile')

      await refreshUser()
      toast.success('Personal details updated successfully')
      setIsEditing(false)
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h1 className="text-xl font-semibold mb-2">Sign in to view your account</h1>
            <Button asChild className="mt-3"><Link href="/login">Sign In</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const fullAddress = [user.address, user.city, user.state, user.zip].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {/* Header Profile Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-foreground text-background flex items-center justify-center text-2xl font-black shadow-md">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">{user.name}</h1>
                    {user.role === 'admin' && (
                      <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-semibold">Admin</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5" /> {user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant={isEditing ? 'secondary' : 'default'}
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex-1 sm:flex-none font-semibold"
                >
                  {isEditing ? <X className="w-4 h-4 mr-1.5" /> : <Edit3 className="w-4 h-4 mr-1.5" />}
                  {isEditing ? 'Cancel Edit' : 'Edit Personal Details'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout} className="text-destructive hover:bg-destructive/10 border-destructive/30">
                  <LogOut className="w-4 h-4 mr-1.5" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>

          {/* Edit Personal Details Form / View Card */}
          {isEditing ? (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-md animate-in fade-in-50 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border mb-6 gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-accent" /> Edit Personal Details
                  </h2>
                  <p className="text-xs text-muted-foreground">Update your name, contact details, and shipping address</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUseLocation}
                    disabled={locating}
                    className="text-xs font-semibold flex items-center gap-1.5 border-foreground/30 hover:border-foreground"
                  >
                    {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5 text-red-500" />}
                    {locating ? 'Locating...' : 'Use My Current Location'}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                    <X className="w-5 h-5 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Full Name *
                    </label>
                    <Input
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Phone Number
                    </label>
                    <Input
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Street Address
                  </label>
                  <Input
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="House / Flat No., Street, Area"
                  />
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      City
                    </label>
                    <Input
                      value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      State
                    </label>
                    <Input
                      value={formData.state}
                      onChange={e => setFormData({ ...formData, state: e.target.value })}
                      placeholder="State"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      ZIP / PIN Code
                    </label>
                    <Input
                      value={formData.zip}
                      onChange={e => setFormData({ ...formData, zip: e.target.value })}
                      placeholder="600001"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-border">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" /> Change Password (Optional)
                  </label>
                  <Input
                    type="password"
                    value={formData.newPassword}
                    onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                    placeholder="Leave blank to keep current password"
                    minLength={6}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={saving} className="font-bold">
                    <Save className="w-4 h-4 mr-1.5" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-accent" /> Personal Information
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-xs font-semibold">
                  <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="bg-muted/30 border border-border/60 rounded-xl p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">Phone Number</span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    {user.phone || 'Not set'}
                  </span>
                </div>

                <div className="bg-muted/30 border border-border/60 rounded-xl p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">Default Shipping Address</span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{fullAddress || 'Not set'}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Links Navigation Grid */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: Package, label: 'My Orders', href: '/orders', desc: 'Track & view purchases' },
              { icon: Heart, label: 'Wishlist', href: '/wishlist', desc: 'Your saved items' },
              { icon: ShoppingCart, label: 'Cart', href: '/cart', desc: 'Items waiting for checkout' },
            ].map(({ icon: Icon, label, href, desc }) => (
              <Link key={href} href={href} className="group bg-card border border-border rounded-2xl p-5 hover:border-foreground/30 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Icon className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-foreground">{label}</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </Link>
            ))}
          </div>

          {/* Admin Dashboard Entry Card */}
          {user.role === 'admin' && (
            <Link href="/secure-admin" className="flex items-center justify-between bg-foreground text-background rounded-2xl p-5 hover:opacity-95 transition-opacity shadow-md">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-background/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-background" />
                </div>
                <div>
                  <p className="font-bold text-sm">Admin Management Console</p>
                  <p className="text-xs text-background/70">Manage inventory, orders, customers & settings</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-background/70" />
            </Link>
          )}

          {/* Recent Orders Section */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold text-base text-foreground">Recent Orders</h2>
              <Button variant="ghost" size="sm" asChild className="text-xs font-semibold">
                <Link href="/orders">View All Orders</Link>
              </Button>
            </div>
            {orders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No orders placed yet</div>
            ) : (
              <div className="divide-y divide-border">
                {orders.map(order => (
                  <Link key={order.id} href={`/orders/${order.id}`} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-semibold text-sm text-foreground">Order #{order.id}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm">{formatPrice(order.total)}</span>
                      <Badge className={`text-xs capitalize font-semibold ${getOrderStatusColor(order.status)}`}>
                        {order.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
