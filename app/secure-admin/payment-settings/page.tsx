'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { Upload, Save, QrCode, ImageIcon } from 'lucide-react'
import AdminShell from '../admin-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data, isLoading, mutate } = useSWR('/api/admin/payment-settings', fetcher)

  useEffect(() => {
    if (data?.settings) {
      setUpiId(data.settings.upi_id || '')
      setBusinessName(data.settings.business_name || '')
      setQrUrl(data.settings.qr_image_url || '')
    }
  }, [data])

  const uploadQR = async (file: File) => {
    setUploading(true)
    
    // Client-side image compression for the QR code
    let fileToUpload = file
    try {
      const { compressImageFile } = await import('@/lib/image-compress')
      fileToUpload = await compressImageFile(file, 800, 0.85) // Resize to 800px max, perfect for QR codes
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
      const data = await safeParseJson(res)
      if (!res.ok) {
        toast.error(data?.error || 'QR image upload failed')
        return
      }
      if (data?.url) {
        setQrUrl(data.url)
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

  const handleSave = async () => {
    if (!upiId.trim()) { toast.error('UPI ID is required'); return }
    if (!qrUrl) { toast.error('Please upload a QR code image'); return }
    setSaving(true)

    try {
      const res = await fetch('/api/admin/payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upi_id: upiId.trim(), qr_image_url: qrUrl, business_name: businessName.trim() }),
      })
      const json = await res.json()
      if (res.ok) {
        toast.success('Payment settings saved')
        mutate()
      } else {
        toast.error(json.error || 'Failed to save settings')
      }
    } catch {
      toast.error('Network error saving settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell>
      <div className="p-6 max-w-2xl space-y-6">
        <div>
          <h1 className="text-neutral-900 text-2xl font-bold tracking-tight">Payment Settings</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Configure your UPI payment details for customer checkout</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-48 w-48 rounded-xl" />
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-bold text-neutral-900">
                  <QrCode className="w-4 h-4" /> UPI Details
                </CardTitle>
                <CardDescription>Customers will see this when paying via UPI during checkout</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-neutral-700 font-semibold">Business / Name</Label>
                  <Input
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="Zyrocore Store"
                    suppressHydrationWarning
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-neutral-700 font-semibold">UPI ID <span className="text-destructive">*</span></Label>
                  <Input
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                    placeholder="yourname@upi"
                    suppressHydrationWarning
                  />
                  <p className="text-xs text-muted-foreground">e.g. storename@paytm or 9876543210@ybl</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-bold text-neutral-900">
                  <ImageIcon className="w-4 h-4" /> QR Code Image
                </CardTitle>
                <CardDescription>Upload the UPI QR code customers will scan to pay</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {qrUrl && (
                  <div className="relative w-48 h-48 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 flex items-center justify-center p-2 shadow-inner">
                    <Image src={qrUrl} alt="UPI QR Code" fill className="object-contain p-2" sizes="192px" />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadQR(f); e.target.value = '' }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  suppressHydrationWarning
                  className="border-dashed border-neutral-300 text-neutral-700 hover:text-black"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : qrUrl ? 'Replace QR Image' : 'Upload QR Image'}
                </Button>
              </CardContent>
            </Card>

            <Button onClick={handleSave} disabled={saving} suppressHydrationWarning className="w-full bg-black text-white hover:bg-neutral-900 transition-colors py-6 text-sm font-semibold rounded-lg shadow-sm">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Payment Settings'}
            </Button>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
