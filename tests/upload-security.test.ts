import { describe, it, expect } from 'vitest'

describe('BUG-005: File Upload Security, Extension Whitelisting & Magic Byte Validation', () => {
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

  function validateFileConstraints(filename: string, mimeType: string, fileSize: number, maxSizeMB = 10) {
    const MAX_SIZE = maxSizeMB * 1024 * 1024
    if (fileSize > MAX_SIZE) {
      throw new Error(`File size exceeds ${maxSizeMB}MB limit`)
    }

    const ext = (filename.split('.').pop() || '').toLowerCase().trim()

    if (!ext || FORBIDDEN_EXTENSIONS.has(ext)) {
      throw new Error(`Forbidden file extension .${ext || 'unknown'}. Only JPG, PNG, WEBP, and AVIF images are permitted.`)
    }

    if (!DEFAULT_ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(`File format .${ext} is not supported.`)
    }

    if (mimeType) {
      const cleanType = mimeType.toLowerCase().trim()
      if (!ALLOWED_MIME_TYPES.has(cleanType)) {
        throw new Error(`Invalid file MIME type "${mimeType}". Only JPG, PNG, WEBP, and AVIF images are allowed.`)
      }
    }

    return true
  }

  function validateMagicBytes(buffer: Buffer, ext: string): boolean {
    if (buffer.length < 4) return false

    if (ext === 'jpg' || ext === 'jpeg') {
      return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF
    }
    if (ext === 'png') {
      return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47
    }
    if (ext === 'webp') {
      if (buffer.length < 12) return false
      const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
      const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
      return isRiff && isWebp
    }
    return true
  }

  it('should accept valid JPEG image with matching MIME and magic bytes', () => {
    const filename = 'product_photo.jpg'
    const mime = 'image/jpeg'
    const size = 1024 * 100 // 100KB

    expect(validateFileConstraints(filename, mime, size)).toBe(true)

    const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46])
    expect(validateMagicBytes(jpegBuffer, 'jpg')).toBe(true)
  })

  it('should accept valid PNG image with matching MIME and magic bytes', () => {
    const filename = 'hoodie_detail.png'
    const mime = 'image/png'
    const size = 1024 * 200

    expect(validateFileConstraints(filename, mime, size)).toBe(true)

    const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    expect(validateMagicBytes(pngBuffer, 'png')).toBe(true)
  })

  it('should reject SVG files to prevent stored XSS vulnerabilities', () => {
    expect(() => {
      validateFileConstraints('malicious.svg', 'image/svg+xml', 1024)
    }).toThrow(/Forbidden file extension \.svg/)
  })

  it('should reject HTML files even when disguised with image MIME type', () => {
    expect(() => {
      validateFileConstraints('exploit.html', 'image/jpeg', 1024)
    }).toThrow(/Forbidden file extension \.html/)
  })

  it('should reject executable files (.exe, .sh, .php, .js)', () => {
    expect(() => validateFileConstraints('script.php', 'image/png', 1024)).toThrow()
    expect(() => validateFileConstraints('payload.exe', 'image/png', 1024)).toThrow()
    expect(() => validateFileConstraints('runner.sh', 'image/png', 1024)).toThrow()
  })

  it('should reject files exceeding maximum size limit', () => {
    const oversized = 15 * 1024 * 1024 // 15MB (> 10MB limit)
    expect(() => {
      validateFileConstraints('large.jpg', 'image/jpeg', oversized, 10)
    }).toThrow(/exceeds 10MB limit/)
  })

  it('should reject corrupted or spoofed files where magic bytes do not match declared extension', () => {
    const fakeJpeg = Buffer.from([0x3C, 0x68, 0x74, 0x6D, 0x6C, 0x3E]) // <html> in ASCII
    expect(validateMagicBytes(fakeJpeg, 'jpg')).toBe(false)
  })
})
