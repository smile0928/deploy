import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CRITICAL: params is a Promise in Next.js 16, must await it!
    const { id: postId } = await params

    console.log('🔵 🔵 🔵 LIKE API POST CALLED 🔵 🔵 🔵')
    console.log('postId:', postId)
    
    // Reject undefined/invalid IDs
    if (!postId || postId === 'undefined' || postId === '') {
      console.error('❌ Invalid postId:', postId)
      return NextResponse.json(
        { error: 'Invalid post ID' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log('User from auth:', { userId: user?.id, email: user?.email, authenticated: !!user })

    if (!user) {
      console.error('❌ No authenticated user!')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ User authenticated, processing like...')

    // Verify user exists first
    const { data: userExists, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (userCheckError) {
      console.error('User check error:', userCheckError)
    }

    if (!userExists) {
      console.log('Creating user profile...')
      const adminClient = createAdminClient()
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
        console.error('User creation error:', userCreateError)
      }
    }

    // Check if already liked
    const { data: existingLike, error: existingError } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()

    console.log('Existing like check:', { existingLike, existingError: existingError?.message })

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing like:', existingError)
      return NextResponse.json(
        { error: 'Failed to check like status: ' + existingError.message },
        { status: 500 }
      )
    }

    const adminClient = createAdminClient()

    if (existingLike) {
      console.log('🔁 Existing like found, toggling to UNLIKE...', {
        postId,
        userId: user.id,
        existingLikeId: existingLike.id,
      })

      // Unlike: delete the existing like
      const { error: deleteError } = await adminClient
        .from('post_likes')
        .delete()
        .eq('id', existingLike.id)

      if (deleteError) {
        console.error('Unlike error:', deleteError, { postId, userId: user.id })
        return NextResponse.json(
          { error: 'Failed to unlike: ' + deleteError.message },
          { status: 500 }
        )
      }

      // Get new like count after deletion
      const { count } = await adminClient
        .from('post_likes')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId)

      // Update posts table with new count
      await adminClient
        .from('posts')
        .update({ likes_count: count || 0 })
        .eq('id', postId)

      console.log('✅ Unlike successful, new count:', count)
      return NextResponse.json(
        { liked: false, success: true, likesCount: count || 0 },
        { status: 200 }
      )
    } else {
      console.log('Creating new like...')
      // Like - use admin client
      const { error } = await adminClient
        .from('post_likes')
        .insert([
          {
            post_id: postId,
            user_id: user.id,
          },
        ])

      if (error) {
        console.error('Like error:', error, { postId, userId: user.id })
        
        if (error.code === '23503') {
          return NextResponse.json(
            { error: 'Post not found or user does not exist' },
            { status: 404 }
          )
        }
        
        return NextResponse.json(
          { error: 'Failed to like: ' + error.message },
          { status: 500 }
        )
      }

      // Get new like count
      const { count } = await adminClient
        .from('post_likes')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId)

      // Update posts table with new count
      await adminClient
        .from('posts')
        .update({ likes_count: count || 0 })
        .eq('id', postId)

      // Create a notification for the post owner (if not liking own post)
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
              notification_type: 'like',
              title: 'New like on your post',
              message: null,
            },
          ])
      }

      console.log('Like created successfully, new count:', count)
      return NextResponse.json(
        { liked: true, success: true, likesCount: count || 0 },
        { status: 201 }
      )
    }
  } catch (error) {
    console.error('Like endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
