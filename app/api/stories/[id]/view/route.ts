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

    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const storyId = pathParts[pathParts.length - 2] // Get story ID before /view

    if (!storyId) {
      return NextResponse.json({ error: 'Story ID required' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('story_views')
      .insert([
        {
          story_id: storyId,
          viewer_id: user.id,
        },
      ])

    // Don't fail if already viewed (unique constraint error)
    if (error && error.code !== '23505') {
      console.error('Error marking story as viewed:', error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in story view endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
