import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Use admin client to bypass RLS for public read access
    const supabase = createAdminClient()

    const {
      data: { user },
    } = await createClient().then(c => c.auth.getUser())

    // Allow public access to view posts
    // Get all posts with related data
    // Prefer selecting "type" if the column exists; fall back gracefully if not.
    let posts
    let error

    const withType = await supabase
      .from('posts')
      .select(`
        id,
        user_id,
        content,
        image_url,
        important_moment_url,
        best_scenes_url,
        type,
        anime_tags,
        created_at,
        updated_at,
        users (
          id,
          username,
          email,
          avatar_url,
          full_name
        ),
        post_likes (id, user_id),
        comments (id)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    const missingTypeColumn =
      withType.error &&
      (
        withType.error.code === '42703' ||
        (typeof withType.error.message === 'string' &&
          withType.error.message.toLowerCase().includes("type") &&
          withType.error.message.toLowerCase().includes("column"))
      )

    if (missingTypeColumn) {
      console.warn('posts.type column missing, falling back to query without type')
      const withoutType = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          content,
          image_url,
          important_moment_url,
          best_scenes_url,
          anime_tags,
          created_at,
          updated_at,
          users (
            id,
            username,
            email,
            avatar_url,
            full_name
          ),
          post_likes (id, user_id),
          comments (id)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      posts = withoutType.data
      error = withoutType.error
    } else {
      posts = withType.data
      error = withType.error
    }

    if (error) {
      console.error('Posts fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`API returning ${posts?.length || 0} posts from database`)

    // Transform posts to include likes_count and comments_count (no filtering)
    const transformedPosts = (posts || [])
      .map((post: any) => ({
        ...post,
        likes_count: post.post_likes?.length || 0,
        comments_count: post.comments?.length || 0,
      }))

    console.log(`API returning ${transformedPosts.length} posts`)
    return NextResponse.json(transformedPosts)
  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from regular client
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      content,
      image_url,
      anime_tags,
      tags,
      type,
      important_moment_url,
      best_scenes_url,
    } = body

    const hasContent = typeof content === 'string' && content.trim().length > 0
    const isAnimeWithMedia = type === 'anime' && (body.image_url || body.video_url)
    if (!hasContent && !isAnimeWithMedia) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Normalise anime tags so trending + filters work reliably
    let normalizedAnimeTags: string[] = []

    if (Array.isArray(anime_tags)) {
      normalizedAnimeTags = anime_tags.filter((t) => typeof t === 'string' && t.trim().length > 0)
    } else if (typeof anime_tags === 'string') {
      normalizedAnimeTags = anime_tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    } else if (Array.isArray(tags)) {
      normalizedAnimeTags = tags.filter((t) => typeof t === 'string' && t.trim().length > 0)
    } else if (typeof tags === 'string') {
      normalizedAnimeTags = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    }

    // Use admin client for all operations
    const adminClient = createAdminClient()

    // First, ensure user exists in our users table
    const { data: existingUser, error: userCheckError } = await adminClient
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    // If user doesn't exist, create them
    if (!existingUser) {
      const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user'
      const { error: userCreateError } = await adminClient
        .from('users')
        .insert([
          {
            id: user.id,
            email: user.email || '',
            username: username,
            bio: null,
            full_name: user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
            website: null,
            location: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])

      if (userCreateError) {
        console.error('Failed to create user:', userCreateError)
        // Only fail if it's not a duplicate key error
        if (userCreateError.code !== 'PGRST301') {
          return NextResponse.json(
            { error: 'Failed to create user profile' },
            { status: 500 }
          )
        }
      }
    }

    // Now create the post
    const insertPayload: any = {
      user_id: user.id,
      content,
      image_url: image_url || null,
      anime_tags: normalizedAnimeTags,
    }

    // Optional extra highlight media
    if (important_moment_url) {
      insertPayload.important_moment_url = important_moment_url
    }
    if (best_scenes_url) {
      insertPayload.best_scenes_url = best_scenes_url
    }

    if (type) {
      insertPayload.type = type
    }

    let { data, error } = await adminClient
      .from('posts')
      .insert([insertPayload])
      .select()
      .single()

    // Gracefully handle databases where posts.type has not been added yet
    const isMissingTypeColumnError =
      error &&
      (
        error.code === '42703' ||
        (typeof error.message === 'string' &&
          error.message.toLowerCase().includes("type") &&
          error.message.toLowerCase().includes("column"))
      )

    if (isMissingTypeColumnError) {
      console.warn('posts.type column missing, retrying insert without type')
      delete insertPayload.type
      const retry = await adminClient
        .from('posts')
        .insert([insertPayload])
        .select()
        .single()
      data = retry.data
      error = retry.error
    }

    if (error) {
      console.error('Post creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
