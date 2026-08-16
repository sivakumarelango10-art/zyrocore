import { put } from '@vercel/blob'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

export interface UploadOptions {
  folder?: string
  maxSizeMB?: number
  allowedExtensions?: string[]
}

const DEFAULT_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic']
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
])

const FORBIDDEN_EXTENSIONS = new Set([
  'html', 'htm', 'svg', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx',
  'php', 'phtml', 'exe', 'bat', 'sh', 'py', 'rb', 'cgi', 'pl',
  'jsp', 'asp', 'aspx', 'cmd', 'vbs', 'scr', 'dll', 'com', 'bin'
])

function validateImageMagicBytes(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 4) return false

  // JPEG: FF D8 FF
  if (ext === 'jpg' || ext === 'jpeg') {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF
  }

  // PNG: 89 50 4E 47
  if (ext === 'png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47
  }

  // WebP: RIFF .... WEBP
  if (ext === 'webp') {
    if (buffer.length < 12) return false
    const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
    const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    return isRiff && isWebp
  }

  // AVIF / HEIC: starts with 'ftyp' at offset 4
  if (ext === 'avif' || ext === 'heic') {
    if (buffer.length < 12) return false
    const isFtyp = buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70
    return isFtyp
  }

  return true
}

/**
 * Consolidated secure image upload helper supporting Supabase Storage, Vercel Blob, and local fallback.
 */
export async function uploadImageToStorage(file: File, options: UploadOptions = {}): Promise<string> {
  const {
    folder = 'uploads',
    maxSizeMB = 10,
    allowedExtensions = DEFAULT_ALLOWED_EXTENSIONS,
  } = options

  if (!file) {
    throw new Error('No file provided')
  }

  const MAX_SIZE = maxSizeMB * 1024 * 1024
  if (file.size > MAX_SIZE) {
    throw new Error(`File size exceeds ${maxSizeMB}MB limit`)
  }

  const rawFilename = file.name || 'image.jpg'
  const ext = (rawFilename.split('.').pop() || '').toLowerCase().trim()

  if (!ext || FORBIDDEN_EXTENSIONS.has(ext)) {
    throw new Error(`Forbidden file extension .${ext || 'unknown'}. Only JPG, PNG, WEBP, and AVIF images are permitted.`)
  }

  if (!allowedExtensions.includes(ext)) {
    throw new Error(`File format .${ext} is not supported. Please upload an allowed image format (${allowedExtensions.join(', ')}).`)
  }

  if (file.type) {
    const cleanType = file.type.toLowerCase().trim()
    if (!ALLOWED_MIME_TYPES.has(cleanType)) {
      throw new Error(`Invalid file MIME type "${file.type}". Only JPG, PNG, WEBP, and AVIF images are allowed.`)
    }
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  if (!validateImageMagicBytes(buffer, ext)) {
    throw new Error('File content signature does not match a valid image format.')
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
      const base64 = buffer.toString('base64')
      const mime = file.type || `image/${sanitizedExt}`
      fileUrl = `data:${mime};base64,${base64}`
    }
  }

  return fileUrl
}
