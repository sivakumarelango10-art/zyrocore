'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { ShoppingBag } from 'lucide-react'

interface RazorpayCheckoutButtonProps {
  amountInRupees?: number
  buttonText?: string
  className?: string
  onSuccess?: (details: any) => void
  onFailure?: (error: any) => void
}

export default function RazorpayCheckoutButton({
  amountInRupees = 500,
  buttonText = 'Pay with Razorpay',
  className = 'bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md',
  onSuccess,
  onFailure,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false)
        return
      }
      if ((window as any).Razorpay) {
        resolve(true)
        return
      }

      const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]')
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true))
        existingScript.addEventListener('error', () => resolve(false))
        return
      }

      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const handleCheckout = async () => {
    try {
      setLoading(true)

      // 1. Ensure Razorpay Checkout SDK is loaded
      const isLoaded = await loadRazorpayScript()
      if (!isLoaded) {
        toast.error('Failed to load Razorpay Checkout SDK. Please check your internet connection.')
        setLoading(false)
        return
      }

      // 2. Call backend endpoint to create order (amount in paise)
      const amountInPaise = Math.round(amountInRupees * 100)

      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `rcpt_demo_${Date.now()}`,
        }),
      })

      const orderData = await orderRes.json()

      if (!orderRes.ok) {
        toast.error(orderData.error || 'Failed to create Razorpay payment order')
        setLoading(false)
        if (onFailure) onFailure(orderData)
        return
      }

      // 3. Open Razorpay Checkout Modal
      const options = {
        key: orderData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'ZYRØCORE',
        description: 'Standard Web Checkout Payment',
        order_id: orderData.order_id || orderData.id,
        theme: {
          color: '#000000',
        },
        handler: async function (response: {
          razorpay_payment_id: string
          razorpay_order_id: string
          razorpay_signature: string
        }) {
          const verifyToast = toast.loading('Verifying payment signature...')
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            const verifyData = await verifyRes.json()

            if (verifyRes.ok && verifyData.success) {
              toast.success('Payment verified successfully!', { id: verifyToast })
              if (onSuccess) onSuccess(verifyData)
            } else {
              toast.error(verifyData.error || 'Payment signature verification failed', { id: verifyToast })
              if (onFailure) onFailure(verifyData)
            }
          } catch (err: any) {
            toast.error(err?.message || 'Error verifying payment signature', { id: verifyToast })
            if (onFailure) onFailure(err)
          } finally {
            setLoading(false)
          }
        },
        modal: {
          ondismiss: function () {
            toast.info('Razorpay payment modal closed by user.')
            setLoading(false)
          },
        },
      }

      const rzp = new (window as any).Razorpay(options)

      rzp.on('payment.failed', function (resp: any) {
        console.error('[Razorpay Checkout] Payment failed event:', resp.error)
        toast.error(resp.error?.description || 'Payment process failed')
        setLoading(false)
        if (onFailure) onFailure(resp.error)
      })

      rzp.open()
    } catch (err: any) {
      console.error('[Razorpay Checkout] Exception:', err)
      toast.error(err?.message || 'Unable to initiate Razorpay checkout')
      setLoading(false)
      if (onFailure) onFailure(err)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={loading}
      className={className}
    >
      <ShoppingBag className="w-5 h-5" />
      <span>{loading ? 'Initiating Payment...' : buttonText}</span>
    </button>
  )
}
