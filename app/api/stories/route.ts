import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

const DEMO_STORIES = [
  {
    id: 'demo-1',
    user_id: '1',
    content: '🎌 Just finished watching the latest anime episode!',
    image_url: 'https://images.unsplash.com/photo-1578375052069-4a0a1d50db73?w=400&h=500&fit=crop',
    video_url: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
    view_count: 42,
    has_viewed: false,
    user: {
      id: '1',
      username: 'AnimeLover01',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=animelover01',
    },
  },
  {
    id: 'demo-2',
    user_id: '2',
    content: 'Studio Ghibli is recruiting artists! 🎨',
    image_url: 'https://images.unsplash.com/photo-1618519738387-cd10b346e0e5?w=400&h=500&fit=crop',
    video_url: null,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
    view_count: 89,
    has_viewed: false,
    user: {
      id: '2',
      username: 'TokyoDreamer',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tokyodreamer',
    },
  },
  {
    id: 'demo-3',
    user_id: '3',
    content: 'My manga collection just hit 500! 📚',
    image_url: 'https://images.unsplash.com/photo-1540274455342-290ce2f93be4?w=400&h=500&fit=crop',
    video_url: null,
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    view_count: 156,
    has_viewed: false,
    user: {
      id: '3',
      username: 'MangaCollector',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mangacollector',
    },
  },
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content, image_url, video_url } = body

    if (!content && !image_url && !video_url) {
      return NextResponse.json(
        { error: 'Story must have content, image, or video' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('stories')
      .insert([
        {
          user_id: user.id,
          content,
          image_url,
          video_url,
        },
      ])
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    console.error('Error creating story:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // If no user, return demo stories
    if (!user) {
      return NextResponse.json(DEMO_STORIES)
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')

    let query = supabase
      .from('stories')
      .select(`
        *,
        user:users(id, username, avatar_url),
        views:story_views(viewer_id)
      `)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    // If specific user requested, get only their stories
    if (userId) {
      query = query.eq('user_id', userId)
    } else {
      // Get stories from users the current user follows
      const { data: following } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingIds = following?.map(f => f.following_id) || []
      followingIds.push(user.id) // Include own stories

      if (followingIds.length > 0) {
        query = query.in('user_id', followingIds)
      } else {
        // Return demo stories if user has no followers yet
        return NextResponse.json(DEMO_STORIES)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Story query error:', error)
      // Return demo stories if table doesn't exist yet
      if (error.message?.includes('does not exist')) {
        return NextResponse.json(DEMO_STORIES)
      }
      return NextResponse.json(DEMO_STORIES)
    }

    // If no real stories, return demo stories
    if (!data || data.length === 0) {
      return NextResponse.json(DEMO_STORIES)
    }

    // Transform data to include view count and viewer status
    const transformedStories = (data || []).map((story: any) => ({
      ...story,
      view_count: story.views?.length || 0,
      views: undefined, // Remove the raw views array
      has_viewed: story.views?.some((v: any) => v.viewer_id === user.id) || false,
    }))

    return NextResponse.json(transformedStories)
  } catch (error) {
    console.error('Error fetching stories:', error)
    return NextResponse.json(DEMO_STORIES)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const storyId = url.pathname.split('/').pop()

    if (!storyId) {
      return NextResponse.json({ error: 'Story ID required' }, { status: 400 })
    }

    // Check story ownership
    const { data: story } = await supabase
      .from('stories')
      .select('user_id')
      .eq('id', storyId)
      .single()

    if (!story || story.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized or story not found' },
        { status: 403 }
      )
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('stories')
      .delete()
      .eq('id', storyId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting story:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
