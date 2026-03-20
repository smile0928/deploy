import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('cover') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Max 5MB.' },
        { status: 400 }
      )
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-cover-${Date.now()}.${fileExt}`
    const filePath = `covers/${fileName}`

    const adminClient = createAdminClient()

    const { error: uploadError } = await adminClient.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Cover upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file: ' + uploadError.message },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = adminClient.storage
      .from('avatars')
      .getPublicUrl(filePath)

    const cover_url = publicUrlData.publicUrl

    const { error: updateError } = await adminClient
      .from('users')
      .update({ cover_url, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (updateError) {
      console.error('Cover update error:', updateError)
      const isMissingColumn = updateError.code === 'PGRST204' || updateError.message?.includes('cover_url')
      return NextResponse.json(
        {
          error: isMissingColumn
            ? 'cover_url column missing. Run in Supabase SQL Editor: ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url TEXT;'
            : 'Failed to update profile',
          code: updateError.code,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ cover_url })
  } catch (error) {
    console.error('Cover upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
