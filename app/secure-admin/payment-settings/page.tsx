'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { Upload, Save, QrCode, ImageIcon, CreditCard, ShieldCheck, KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import AdminShell from '../admin-shell'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import Image from 'next/image'
import { safeParseJson } from '@/lib/utils-shop'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function AdminPaymentSettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [upiId, setUpiId] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [razorpayKeyId, setRazorpayKeyId] = useState('')
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data, isLoading, mutate } = useSWR('/api/admin/payment-settings', fetcher)

  useEffect(() => {
    if (data?.settings) {
      setUpiId(data.settings.upi_id || '')
      setBusinessName(data.settings.business_name || '')
      setQrUrl(data.settings.qr_image_url || '')
      setRazorpayKeyId(data.settings.razorpay_key_id || '')
      setRazorpayKeySecret(data.settings.razorpay_key_secret || '')
    }
  }, [data])

  const uploadQR = async (file: File) => {
    setUploading(true)

    let fileToUpload = file
    try {
      const { compressImageFile } = await import('@/lib/image-compress')
      fileToUpload = await compressImageFile(file, 800, 0.85)
    } catch (err) {
      console.warn('QR compression failed, uploading original:', err)
    }

    const fd = new FormData()
    fd.append('file', fileToUpload)

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: fd,
      })
      const uploadData = await safeParseJson(res)
      if (!res.ok) {
        toast.error(uploadData?.error || 'QR image upload failed')
        return
      }
      if (uploadData?.url) {
        setQrUrl(uploadData.url)
        toast.success('QR image uploaded')
      } else {
        toast.error('Upload succeeded but no image URL returned')
      }
    } catch {
      toast.error('Network error uploading image')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/admin/payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upi_id: upiId.trim(),
          qr_image_url: qrUrl,
          business_name: businessName.trim(),
          razorpay_key_id: razorpayKeyId.trim(),
          razorpay_key_secret: razorpayKeySecret.trim(),
        }),
      })
      const json = await res.json()
      if (res.ok) {
        toast.success('Payment settings saved successfully')
        mutate()
      } else {
        toast.error(json.error || 'Failed to save payment settings')
      }
    } catch {
      toast.error('Network error saving settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell>
      <div className="p-6 max-w-4xl space-y-6 pb-12">
        {/* Page Header */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-500 uppercase mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Payment & Checkout Controls
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">Payment Settings</h1>
          <p className="text-sm text-neutral-500 mt-1">Configure Razorpay Gateway, Direct UPI IDs, and QR Code settings for customer checkout.</p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Section 1: Razorpay Payment Gateway */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-neutral-900">Razorpay Payment Gateway</h2>
                    <p className="text-xs text-neutral-500">Automated UPI, Cards, NetBanking & Instant Verification</p>
                  </div>
                </div>
                {data?.settings?.env_key_id ? (
                  <span className="px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Razorpay Active ({data.settings.env_key_id})
                  </span>
                ) : (
                  <span className="px-3 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full border border-amber-200 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" /> Manual / Database Keys Mode
                  </span>
                )}
              </div>

              <div className="p-6 space-y-4">
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 text-xs text-neutral-600 space-y-1">
                  <p className="font-semibold text-neutral-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> How Razorpay Payments Work
                  </p>
                  <p>
                    When customers place an order at checkout, Razorpay opens an inline modal supporting <strong>GPay, PhonePe, Paytm, BHIM UPI, Cards, and NetBanking</strong>. Payment amounts are calculated directly on the server to prevent manipulation, and verified via HMAC SHA-256 signatures.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Razorpay Key ID
                    </label>
                    <input
                      type="text"
                      value={razorpayKeyId}
                      onChange={e => setRazorpayKeyId(e.target.value)}
                      placeholder="rzp_live_... or rzp_test_..."
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all"
                    />
                    <p className="text-[11px] text-neutral-400 mt-1">Leave empty to use keys from server .env file</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Razorpay Key Secret
                    </label>
                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={razorpayKeySecret}
                        onChange={e => setRazorpayKeySecret(e.target.value)}
                        placeholder="Enter key secret"
                        className="w-full px-3.5 py-2.5 pr-10 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1">Kept confidential on the server</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Direct UPI & QR Code Settings */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-neutral-900">Direct UPI & QR Code Details</h2>
                    <p className="text-xs text-neutral-500">Business UPI VPA handle and QR image for scan-and-pay</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Business / Store Name
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      placeholder="Zyrocore Store"
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      UPI ID (VPA) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      placeholder="yourname@upi"
                      required
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all"
                    />
                    <p className="text-[11px] text-neutral-400 mt-1">e.g., storename@paytm or 9876543210@ybl</p>
                  </div>
                </div>

                {/* QR Code Upload */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-2">
                    UPI QR Code Image
                  </label>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {qrUrl ? (
                      <div className="relative w-40 h-40 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 flex items-center justify-center p-2 shadow-inner flex-shrink-0">
                        <Image src={qrUrl} alt="UPI QR Code" fill className="object-contain p-2" sizes="160px" />
                      </div>
                    ) : (
                      <div className="w-40 h-40 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 flex flex-col items-center justify-center text-center p-3 flex-shrink-0">
                        <ImageIcon className="w-8 h-8 text-neutral-300 mb-1" />
                        <span className="text-[11px] text-neutral-400 font-medium">No QR Code</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadQR(f); e.target.value = '' }}
                      />
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4 text-neutral-500" />
                        {uploading ? 'Compressing & Uploading...' : qrUrl ? 'Replace QR Code Image' : 'Upload QR Code Image'}
                      </button>
                      <p className="text-[11px] text-neutral-400">Supported formats: JPG, PNG, WEBP. Max size: 5MB.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 text-xs font-semibold text-white bg-black hover:bg-neutral-800 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving Payment Settings...' : 'Save Payment Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminShell>
  )
}
