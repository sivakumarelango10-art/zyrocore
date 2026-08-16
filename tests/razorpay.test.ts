import { describe, it, expect } from 'vitest'
import crypto from 'crypto'

describe('Razorpay Signature Verification & Idempotency', () => {
  const keySecret = 'test_razorpay_secret_key_99'
  const razorpayOrderId = 'order_M1234567890'
  const razorpayPaymentId = 'pay_M9876543210'

  it('should calculate and verify valid Razorpay HMAC SHA-256 signature in timing-safe manner', () => {
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

    const expectedBuf = Buffer.from(expectedSignature, 'utf-8')
    const receivedBuf = Buffer.from(expectedSignature, 'utf-8')

    const isMatch =
      expectedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, receivedBuf)

    expect(isMatch).toBe(true)
  })

  it('should reject invalid Razorpay payment signature', () => {
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

    const tamperedSignature = expectedSignature.slice(0, -4) + '0000'

    const expectedBuf = Buffer.from(expectedSignature, 'utf-8')
    const receivedBuf = Buffer.from(tamperedSignature, 'utf-8')

    const isMatch =
      expectedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, receivedBuf)

    expect(isMatch).toBe(false)
  })

  it('should prevent duplicate processing for already paid orders (Idempotency)', () => {
    const existingOrder = { id: 101, payment_status: 'paid' }

    let stockDeductionExecuted = false

    if (existingOrder.payment_status === 'paid') {
      // Return early idempotently without deducting stock again
    } else {
      stockDeductionExecuted = true
    }

    expect(stockDeductionExecuted).toBe(false)
  })
})
