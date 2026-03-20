import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CRITICAL: params is a Promise in Next.js 16, must await it!
    const { id: postId } = await params
    
    console.log('🔵 Comments GET API called with postId:', postId)

    if (!postId || postId === 'undefined' || postId === '') {
      console.error('❌ Invalid postId:', postId)
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        users (id, username, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get comments error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('GET comments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CRITICAL: params is a Promise in Next.js 16, must await it!
    const { id: postId } = await params
    
    console.log('🔵 Comments POST API called with postId:', postId)
    
    if (!postId) {
      console.error('❌ Missing postId')
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 })
    }

    const supabase = await createClient()
    const adminClient = createAdminClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('No authenticated user for comment')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    console.log('Creating comment:', { postId, userId: user.id, contentLength: content.length })

    // Verify post exists before creating comment
    const { data: postExists, error: postError } = await supabase
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .maybeSingle()

    if (postError) {
      console.error('Error checking post:', postError)
      return NextResponse.json({ error: 'Failed to verify post: ' + postError.message }, { status: 500 })
    }

    if (!postExists) {
      console.error('Post not found:', postId)
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Prevent users from commenting on their own posts
    if (postExists.user_id === user.id) {
      console.warn('User attempted to comment on own post:', { postId, userId: user.id })
      return NextResponse.json(
        { error: 'You cannot comment on your own post' },
        { status: 400 }
      )
    }

    // Verify user exists before creating comment
    const { data: userExists, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (userCheckError) {
      console.error('User check error:', userCheckError)
    }

    if (!userExists) {
      console.log('Creating user profile for comment...')
      // Create user if they don't exist
      const { error: userCreateError } = await adminClient
        .from('users')
        .insert([
          {
            id: user.id,
            email: user.email || '',
            username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
            full_name: user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
          },
        ])

      if (userCreateError && userCreateError.code !== '23505') {
        console.error('Error creating user for comment:', userCreateError)
        return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
      }
    }

    // Enforce at API level: only one comment per user per post
    const { data: existingComment, error: existingCommentError } = await supabase
      .from('comments')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingCommentError) {
      console.error('Existing comment check error:', existingCommentError)
      return NextResponse.json(
        { error: 'Failed to verify existing comments: ' + existingCommentError.message },
        { status: 500 }
      )
    }

    if (existingComment) {
      console.warn('User attempted multiple comments on same post:', {
        postId,
        userId: user.id,
        commentId: existingComment.id,
      })
      return NextResponse.json(
        { error: 'You can only comment once on a post' },
        { status: 400 }
      )
    }

    // Insert comment
    const { data, error } = await adminClient
      .from('comments')
      .insert([
        {
          post_id: postId,
          user_id: user.id,
          content,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Comment insert error:', error)

      // Handle unique constraint violation from DB (one comment per user per post)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'You can only comment once on a post' },
          { status: 400 }
        )
      }
      
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Post or user does not exist' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create comment: ' + error.message },
        { status: 500 }
      )
    }

    // Get new comment count
    const { count } = await adminClient
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId)

    // Update posts table with new count
    await adminClient
      .from('posts')
      .update({ comments_count: count || 0 })
      .eq('id', postId)

    // Notify post owner about new comment
    const { data: postOwner } = await adminClient
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .maybeSingle()

    if (postOwner?.user_id && postOwner.user_id !== user.id) {
      await adminClient
        .from('notifications')
        .insert([
          {
            user_id: postOwner.user_id,
            sender_id: user.id,
            notification_type: 'comment',
            title: 'New comment on your post',
            message: null,
          },
        ])
    }

    console.log('Comment created successfully:', data?.id, 'new count:', count)
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('POST comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
