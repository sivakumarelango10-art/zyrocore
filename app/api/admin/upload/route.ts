import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { logAdminAction } from '@/lib/audit'
import { uploadImageToStorage } from '@/lib/upload'

export async function POST(req: NextRequest) {
  let admin
  try {
    admin = await requireAdmin()
  } catch (err) {
    console.error('[upload auth error]:', err)
    return NextResponse.json({ error: 'Unauthorized admin session' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileUrl = await uploadImageToStorage(file, { folder: 'products' })

    try {
      await logAdminAction(admin.id, 'image_upload', `Uploaded file: ${file.name} (${(file.size / 1024).toFixed(1)} KB) -> ${fileUrl}`)
    } catch { /* non-fatal */ }

    return NextResponse.json({ url: fileUrl })
  } catch (error) {
    console.error('[upload] Unexpected server error:', error)
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
