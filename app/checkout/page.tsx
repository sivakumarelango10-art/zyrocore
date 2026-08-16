'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { ChevronRight, ShieldCheck, MapPin, Loader2, CreditCard } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatPrice } from '@/lib/utils-shop'
import { useAuth } from '@/components/auth-provider'
import { getCurrentLocationAddress, fetchAddressByPincode, matchIndianState } from '@/lib/google-maps'
import { toast } from 'sonner'

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu',
  'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
]

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface CartItem {
  id: number
  product_id: number
  quantity: number
  size: string | null
  name: string
  price: number
  discount_price: number | null
  images: string[]
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise(resolve => {
    // Already loaded
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      return resolve(true)
    }
    // Don't inject twice
    if (document.querySelector('script[src*="checkout.razorpay.com"]')) {
      // Script tag exists but Razorpay not yet on window — wait for it
      const poll = setInterval(() => {
        if ((window as any).Razorpay) { clearInterval(poll); resolve(true) }
      }, 100)
      setTimeout(() => { clearInterval(poll); resolve(!!(window as any).Razorpay) }, 8000)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.crossOrigin = 'anonymous'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function CheckoutPage() {
  const { user, refreshUser } = useAuth()
  const router = useRouter()
  const { data: cartData } = useSWR(user ? '/api/cart' : null, fetcher)

  const items: CartItem[] = cartData?.items ?? []

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    address2: '',
    landmark: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    country: 'India',
  })
  const [saveToProfile, setSaveToProfile] = useState(true)

  const [loadingPincode, setLoadingPincode] = useState(false)

  // Auto-fill form from saved profile details when user is loaded
  useEffect(() => {
    if (user) {
      const pin = user.zip || ''
      setForm(f => ({
        ...f,
        name: f.name || user.name || '',
        phone: f.phone || user.phone || '',
        address: f.address || user.address || '',
        city: f.city || user.city || '',
        state: f.state || user.state || '',
        pincode: f.pincode || pin,
      }))
      if (pin && pin.length === 6 && (!user.city || !user.state)) {
        fetchAddressByPincode(pin).then(geo => {
          if (geo) {
            setForm(f => ({
              ...f,
              city: f.city || geo.city,
              district: f.district || geo.district,
              state: f.state || matchIndianState(geo.state),
            }))
          }
        })
      }
    }
  }, [user])

  const handlePincodeChange = async (val: string) => {
    const cleanVal = val.replace(/\D/g, '').slice(0, 6)
    setForm(f => ({ ...f, pincode: cleanVal }))

    if (cleanVal.length === 6) {
      setLoadingPincode(true)
      try {
        const geo = await fetchAddressByPincode(cleanVal)
        if (geo) {
          setForm(f => ({
            ...f,
            city: geo.city || f.city,
            district: geo.district || f.district,
            state: matchIndianState(geo.state) || f.state,
          }))
          toast.success(`Auto-filled city, district & state for PIN ${cleanVal}`)
        }
      } catch {
        // Non-fatal
      } finally {
        setLoadingPincode(false)
      }
    }
  }

  const [placing, setPlacing] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const subtotal = items.reduce((sum, item) => sum + (item.discount_price ?? item.price) * item.quantity, 0)
  const shipping = 0
  const total = subtotal + shipping

  const [locating, setLocating] = useState(false)

  const handleUseLocation = async () => {
    setLocating(true)
    const toastId = toast.loading('Detecting your GPS location...')
    try {
      const geo = await getCurrentLocationAddress()
      setForm(f => ({
        ...f,
        address: geo.address || f.address,
        address2: geo.address2 || f.address2,
        landmark: geo.locality || f.landmark,
        city: geo.city || f.city,
        district: geo.district || f.district,
        state: geo.state || f.state,
        pincode: geo.pincode || f.pincode,
        country: 'India',
      }))
      toast.success('Address auto-filled from your location!', { id: toastId })
    } catch (err: any) {
      toast.error(err.message || 'Failed to detect location', { id: toastId })
    } finally {
      setLocating(false)
    }
  }

  const handleChange = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side validations
    if (items.length === 0) { toast.error('Your cart is empty'); return }
    if (!form.name.trim()) { toast.error('Please enter your full name'); return }
    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) { toast.error('Enter a valid 10-digit Indian mobile number'); return }
    if (!form.address.trim()) { toast.error('Please enter your delivery address'); return }
    if (!form.city.trim()) { toast.error('Please enter your city'); return }
    if (!form.state) { toast.error('Please select your state'); return }
    if (!/^\d{6}$/.test(form.pincode.trim())) { toast.error('Enter a valid 6-digit PIN code'); return }
    if (!termsAccepted) { toast.error('Please accept the Privacy Policy and Terms & Conditions'); return }

    setPlacing(true)

    // Save profile address if requested by user
    if (saveToProfile) {
      try {
        await fetch('/api/account/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            zip: form.pincode.trim(),
          }),
        })
        if (refreshUser) await refreshUser()
      } catch (err) {
        console.error('[saveToProfile error]:', err)
      }
    }
    try {
      const orderItems = items.map(item => ({
        product_id: item.product_id,
        product_name: item.name,
        product_image: item.images?.[0] || null,
        price: item.discount_price ?? item.price,
        quantity: item.quantity,
        size: item.size,
      }))

      // 0. Pre-validate cart items against real-time database stock
      const valRes = await fetch('/api/cart/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: orderItems }),
      })
      const valData = await valRes.json()
      if (valRes.ok && !valData.valid) {
        const firstErr = valData.errors?.[0]?.message || 'Some items in your cart are no longer available in the requested quantity.'
        toast.error(firstErr)
        setPlacing(false)
        return
      }

      // 1. Create order record in backend DB
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipping: form, items: orderItems, payment_method: 'Razorpay' }),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || "We couldn't start your payment. Please try again.")
        setPlacing(false)
        return
      }

      const createdOrderId = json.orderId

      // 2. Load Razorpay Checkout SDK script
      const loaded = await loadRazorpayScript()
      if (!loaded) {
        toast.error('Failed to load Razorpay Checkout SDK. Please check your internet connection.')
        setPlacing(false)
        return
      }

      // 3. Create Razorpay order on server
      const rzpRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: createdOrderId }),
      })

      const rzpData = await rzpRes.json()

      if (!rzpRes.ok) {
        toast.error(rzpData.error || 'Failed to initialize Razorpay payment session')
        setPlacing(false)
        return
      }

      // 4. Trigger Razorpay Checkout Modal
      const options = {
        key: rzpData.key_id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        name: 'ZYRØCORE',
        description: `Order #${createdOrderId}`,
        order_id: rzpData.id,
        prefill: {
          name: form.name.trim(),
          email: user?.email || '',
          contact: form.phone.trim(),
        },
        theme: {
          color: '#000000',
        },
        handler: async function (response: any) {
          const verifyToast = toast.loading('Verifying Razorpay payment...')
          try {
            const verifyRes = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: createdOrderId,
              }),
            })
            const verifyJson = await verifyRes.json()
            if (verifyRes.ok && verifyJson.success) {
              toast.success('Payment verified successfully!', { id: verifyToast })
              router.push(`/orders/${createdOrderId}?success=1`)
            } else {
              toast.error(verifyJson.error || 'Payment verification failed', { id: verifyToast })
              setPlacing(false)
            }
          } catch (err: any) {
            toast.error(err.message || 'Payment verification error', { id: verifyToast })
            setPlacing(false)
          }
        },
        modal: {
          ondismiss: function () {
            toast.error('Your payment was not completed, so your order was not placed.')
            setPlacing(false)
          },
        },
      }

      const razorpayInstance = new (window as any).Razorpay(options)
      razorpayInstance.on('payment.failed', function () {
        toast.error('Your payment was not completed, so your order was not placed.')
        setPlacing(false)
      })
      razorpayInstance.open()
    } catch (err: any) {
      toast.error(err?.message || "We couldn't start your payment. Please try again.")
      setPlacing(false)
    }
  }

  // Guard: must be authenticated to access checkout
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-semibold mb-2">Sign in to checkout</h1>
            <Button asChild className="mt-3"><Link href="/login">Sign In</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
            <Link href="/cart" className="hover:text-foreground">Cart</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">Checkout</span>
          </nav>

          <h1 className="text-2xl font-bold mb-8">Checkout</h1>

          <form onSubmit={handlePlaceOrder}>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Shipping address */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between gap-2 mb-5">
                    <h2 className="font-semibold text-lg">Delivery Address</h2>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUseLocation}
                      disabled={locating}
                      suppressHydrationWarning
                      className="text-xs flex items-center gap-1.5 border-foreground/30 hover:border-foreground"
                    >
                      {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5 text-red-500" />}
                      {locating ? 'Locating...' : 'Use My Current Location'}
                    </Button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input id="name" value={form.name} onChange={e => handleChange('name', e.target.value)} required placeholder="e.g. Rahul Sharma" suppressHydrationWarning />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="phone">Mobile Number *</Label>
                      <div className="flex gap-2">
                        <span className="inline-flex items-center px-3 rounded-lg border border-border bg-muted text-sm text-muted-foreground flex-shrink-0">+91</span>
                        <Input id="phone" type="tel" inputMode="numeric" maxLength={10} value={form.phone} onChange={e => handleChange('phone', e.target.value.replace(/\D/g, ''))} required placeholder="9876543210" suppressHydrationWarning />
                      </div>
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="address">Address Line 1 *</Label>
                      <Input id="address" value={form.address} onChange={e => handleChange('address', e.target.value)} required placeholder="House No., Building, Street" suppressHydrationWarning />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="address2">Address Line 2 <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Input id="address2" value={form.address2} onChange={e => handleChange('address2', e.target.value)} placeholder="Apartment, floor, area, locality" suppressHydrationWarning />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="landmark">Landmark <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Input id="landmark" value={form.landmark} onChange={e => handleChange('landmark', e.target.value)} placeholder="Near bus stop, school, etc." suppressHydrationWarning />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="pincode">PIN Code *</Label>
                        {loadingPincode && <span className="text-[11px] font-medium text-primary animate-pulse">Auto-filling location...</span>}
                      </div>
                      <Input id="pincode" inputMode="numeric" maxLength={6} value={form.pincode} onChange={e => handlePincodeChange(e.target.value)} required placeholder="600001" suppressHydrationWarning />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="city">City / Town *</Label>
                      <Input id="city" value={form.city} onChange={e => handleChange('city', e.target.value)} required placeholder="Chennai" suppressHydrationWarning />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="district">District <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Input id="district" value={form.district} onChange={e => handleChange('district', e.target.value)} placeholder="Chennai" suppressHydrationWarning />
                    </div>
                    <div className="space-y-1.5">
                      <Label>State *</Label>
                      <Select value={form.state} onValueChange={v => handleChange('state', v)} required>
                        <SelectTrigger suppressHydrationWarning>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="country">Country</Label>
                      <Input id="country" value="India" readOnly className="bg-muted text-muted-foreground cursor-not-allowed" suppressHydrationWarning />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="save-to-profile"
                      checked={saveToProfile}
                      onChange={e => setSaveToProfile(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-foreground focus:ring-foreground accent-foreground cursor-pointer shrink-0"
                    />
                    <label htmlFor="save-to-profile" className="text-xs sm:text-sm text-muted-foreground cursor-pointer select-none">
                      Save this address to my Personal Details for future orders
                    </label>
                  </div>
                </div>

                {/* Payment method info */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h2 className="font-semibold text-lg mb-3">Payment Method</h2>
                  <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">Razorpay Payment Gateway</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-11">
                      All payments are securely processed by <strong>Razorpay</strong>. Supports UPI, Credit/Debit Cards, Netbanking & Wallets with 256-bit SSL encryption.
                    </p>
                  </div>
                </div>
              </div>

              {/* Order summary */}
              <div className="lg:col-span-1">
                <div className="bg-card border border-border rounded-xl p-5 sticky top-24">
                  <h2 className="font-bold text-lg mb-4">Order Summary</h2>
                  <div className="space-y-3 mb-4">
                    {items.map(item => {
                      const price = item.discount_price ?? item.price
                      return (
                        <div key={item.id} className="flex gap-3 items-center">
                          <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                            {item.images?.[0] && (
                              <Image src={item.images[0]} alt={item.name} fill sizes="48px" className="object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium line-clamp-1">{item.name}</p>
                            {item.size && <p className="text-xs text-muted-foreground">Size: {item.size}</p>}
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <p className="text-sm font-medium flex-shrink-0">{formatPrice(price * item.quantity)}</p>
                        </div>
                      )
                    })}
                  </div>
                  <Separator className="mb-4" />
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="text-emerald-500 font-semibold">FREE</span>
                    </div>
                  </div>
                  <Separator className="mb-4" />
                  <div className="flex justify-between font-bold text-lg mb-5">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <div className="flex items-start gap-2.5 mb-4 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                    <input
                      type="checkbox"
                      id="checkout-terms"
                      checked={termsAccepted}
                      onChange={e => setTermsAccepted(e.target.checked)}
                      required
                      className="mt-0.5 h-5 w-5 rounded border-border text-foreground focus:ring-foreground accent-foreground cursor-pointer shrink-0"
                    />
                    <label htmlFor="checkout-terms" className="text-xs sm:text-sm text-muted-foreground leading-snug cursor-pointer select-none">
                      I have read and agree to the{' '}
                      <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline hover:opacity-80">
                        Privacy Policy
                      </Link>{' '}
                      and{' '}
                      <Link href="/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline hover:opacity-80">
                        Terms & Conditions
                      </Link>.
                    </label>
                  </div>
                  <Button type="submit" className="w-full h-12 text-base font-bold" size="lg" disabled={placing || items.length === 0 || !termsAccepted} suppressHydrationWarning>
                    {placing ? 'Connecting to Razorpay...' : 'Pay Now'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    <span>Payments powered by Razorpay</span>
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}
