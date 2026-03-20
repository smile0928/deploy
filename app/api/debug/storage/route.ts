import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    // List all files in avatars bucket root
    const { data: files, error: listError } = await supabase.storage
      .from('avatars')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'updated_at', order: 'desc' },
      })

    if (listError) {
      console.error('List error:', listError)
      return NextResponse.json(
        { error: 'Failed to list files: ' + listError.message },
        { status: 500 }
      )
    }

    console.log('Files in bucket:', files)

    // Get file URLs
    const fileUrls = files
      .filter((file) => !file.name.includes('/')) // Filter out directories
      .map((file) => {
        const publicUrl = supabase.storage.from('avatars').getPublicUrl(file.name).data.publicUrl
        return {
          name: file.name,
          size: file.metadata?.size || 'unknown',
          uploadedAt: file.updated_at,
          url: publicUrl,
        }
      })

    return NextResponse.json({
      files: fileUrls,
      count: fileUrls.length,
      total: files.length,
    })
  } catch (error) {
    console.error('Storage debug error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
