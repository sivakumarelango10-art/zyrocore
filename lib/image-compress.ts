/**
 * Client-side Image Compression Utility
 * Resizes ultra high-resolution photos (e.g. iPhone IMG_8017.JPG) before upload.
 * Shrinks 15MB-25MB camera photos down to ~300KB-800KB without quality loss,
 * preventing server payload limits (413 errors) and network timeouts.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 2000,
  quality = 0.85
): Promise<File> {
  // SVG files or tiny files (< 300KB) don't need raster compression
  if (file.type === 'image/svg+xml' || file.size < 300 * 1024) {
    return file
  }

  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        let { width, height } = img

        // Calculate aspect-ratio downscaling
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height)

        // Determine target mime type (prefer original JPEG/PNG/WEBP)
        const targetType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }

            // Create compressed File preserving original name
            const compressedFile = new File([blob], file.name, {
              type: targetType,
              lastModified: Date.now(),
            })

            resolve(compressedFile)
          },
          targetType,
          quality
        )
      }

      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }

    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}
