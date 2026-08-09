import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import sql from '@/lib/db'
import fs from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    const orderId = formData.get('order_id') as string

    if (!file || !orderId) {
      return NextResponse.json({ error: 'file and order_id are required' }, { status: 400 })
    }

    // M-02: File size guard — 5MB max for payment screenshots
    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 })
    }

    // M-02: Extension + MIME type validation (case-insensitive)
    const ext = (file.name.split('.').pop() ?? '').toLowerCase()
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp']
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedExtensions.includes(ext) || !allowedMimes.includes(file.type.toLowerCase())) {
      return NextResponse.json({ error: 'Only JPG, JPEG, PNG or WebP images are allowed' }, { status: 400 })
    }

    const filename = `payment-screenshots/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    let imageUrl = ''

    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(filename, file, { access: 'public' })
        imageUrl = blob.url
      } else {
        throw new Error('BLOB_READ_WRITE_TOKEN missing')
      }
    } catch {
      try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true })
        }
        const localFileName = `screenshot-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        fs.writeFileSync(path.join(uploadsDir, localFileName), buffer)
        imageUrl = `/uploads/${localFileName}`
      } catch {
        const bytes = await file.arrayBuffer()
        const base64 = Buffer.from(bytes).toString('base64')
        imageUrl = `data:${file.type};base64,${base64}`
      }
    }

    await sql`
      UPDATE orders
      SET payment_screenshot = ${imageUrl}, payment_status = 'submitted'
      WHERE id = ${parseInt(orderId)} AND user_id = ${user.id}
    `

    return NextResponse.json({ url: imageUrl })
  } catch (err) {
    console.error('Upload payment error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

