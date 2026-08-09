import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { uploadImageToStorage } from '@/lib/upload'

export async function POST(req: NextRequest) {
  let user
  try {
    user = await getSession()
  } catch (err) {
    console.error('[upload auth error]:', err)
  }

  if (!user) {
    return NextResponse.json({ error: 'Please sign in to upload images' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileUrl = await uploadImageToStorage(file, { folder: 'uploads' })
    return NextResponse.json({ url: fileUrl })
  } catch (error) {
    console.error('[upload] Server error:', error)
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
