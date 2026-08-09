import { put } from '@vercel/blob'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

export interface UploadOptions {
  folder?: string
  maxSizeMB?: number
  allowedExtensions?: string[]
}

/**
 * Consolidated image upload helper supporting Supabase Storage, Vercel Blob, and local fallback.
 */
export async function uploadImageToStorage(file: File, options: UploadOptions = {}): Promise<string> {
  const {
    folder = 'uploads',
    maxSizeMB = 10,
    allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic', 'svg'],
  } = options

  if (!file) {
    throw new Error('No file provided')
  }

  const MAX_SIZE = maxSizeMB * 1024 * 1024
  if (file.size > MAX_SIZE) {
    throw new Error(`File size exceeds ${maxSizeMB}MB limit`)
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const isImageMime = file.type ? file.type.toLowerCase().startsWith('image/') : true

  if (!allowedExtensions.includes(ext) && !isImageMime) {
    throw new Error(`File format .${ext} is not supported. Please upload an image (JPG, PNG, WEBP).`)
  }

  const sanitizedExt = ext === 'blob' ? 'jpg' : ext
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${sanitizedExt}`

  let fileUrl = ''

  // 1. Attempt Supabase Storage upload first
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseKey) {
    const buckets = ['product', 'products', 'uploads']
    const supabase = createClient(supabaseUrl, supabaseKey)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    for (const bucketName of buckets) {
      try {
        const { data, error } = await supabase.storage.from(bucketName).upload(filename, buffer, {
          contentType: file.type || `image/${sanitizedExt}`,
          cacheControl: '31536000',
          upsert: true,
        })

        if (!error && data?.path) {
          const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(data.path)
          fileUrl = publicData.publicUrl
          break
        }
      } catch {
        // Try next bucket
      }
    }
  }

  // 2. Fallback to Vercel Blob
  if (!fileUrl && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(filename, file, { access: 'public' })
      fileUrl = blob.url
    } catch (blobErr) {
      console.warn('[upload] Vercel Blob upload failed:', blobErr)
    }
  }

  // 3. Fallback to local filesystem / public directory
  if (!fileUrl) {
    try {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
      }

      const localFileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${sanitizedExt}`
      const filePath = path.join(uploadsDir, localFileName)
      fs.writeFileSync(filePath, buffer)

      fileUrl = `/uploads/${localFileName}`
    } catch (localErr) {
      console.warn('[upload] Local disk write failed. Using base64 Data URI:', localErr)
      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      const mime = file.type || `image/${sanitizedExt}`
      fileUrl = `data:${mime};base64,${base64}`
    }
  }

  return fileUrl
}
