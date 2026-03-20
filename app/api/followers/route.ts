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

    const body = await request.json()
    const { following_id } = body

    if (!following_id) {
      return NextResponse.json(
        { error: 'Following ID is required' },
        { status: 400 }
      )
    }

    if (following_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      )
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', following_id)
      .single()

    if (existingFollow) {
      // Unfollow - use admin client
      const adminClient = createAdminClient()
      const { error } = await adminClient
        .from('followers')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', following_id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ following: false })
    } else {
      // Follow - use admin client
      const adminClient = createAdminClient()
      const { error } = await adminClient
        .from('followers')
        .insert([
          {
            follower_id: user.id,
            following_id,
          },
        ])

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Create a notification for the followed user
      await adminClient
        .from('notifications')
        .insert([
          {
            user_id: following_id,
            sender_id: user.id,
            notification_type: 'follow',
            title: 'You have a new follower',
            message: null,
          },
        ])

      return NextResponse.json({ following: true }, { status: 201 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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

    const body = await request.json()
    const { following_id } = body

    if (!following_id) {
      return NextResponse.json(
        { error: 'Following ID is required' },
        { status: 400 }
      )
    }

    // Unfriend: remove only the reciprocal follow (them → me) so we are no longer mutual friends.
    // Keep (me → them) so we still follow them and they stay in Suggestions / Recommendations.
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('followers')
      .delete()
      .eq('follower_id', following_id)
      .eq('following_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ following: false })
  } catch (error) {
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

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'following' // 'following' or 'followers'
    const userId = searchParams.get('user_id') || user.id

    // Use admin client to bypass RLS for reliable reads
    const adminClient = createAdminClient()

    if (type === 'followers') {
      // Get people who follow this user (follower_id = who follows, following_id = who is followed)
      const { data: rows, error } = await adminClient
        .from('followers')
        .select('follower_id')
        .eq('following_id', userId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const followerIds = (rows || []).map((r: { follower_id: string }) => r.follower_id)
      if (followerIds.length === 0) return NextResponse.json([])

      const { data: users, error: usersErr } = await adminClient
        .from('users')
        .select('id, username, avatar_url, bio')
        .in('id', followerIds)

      if (usersErr) {
        return NextResponse.json({ error: usersErr.message }, { status: 500 })
      }

      // Add isFollowing: current user follows this follower back?
      const { data: following } = await adminClient
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id)
        .in('following_id', followerIds)

      const followingIds = new Set((following || []).map((f: { following_id: string }) => f.following_id))
      const usersWithStatus = (users || []).map((u: { id: string; username: string; avatar_url?: string; bio?: string }) => ({
        ...u,
        isFollowing: followingIds.has(u.id),
      }))

      return NextResponse.json(usersWithStatus)
    } else if (type === 'friends' || type === 'mutual') {
      const { data: acceptedRows } = await adminClient
        .from('friend_requests')
        .select('from_user_id, to_user_id')
        .eq('status', 'accepted')
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)

      const friendIds = new Set(
        (acceptedRows || []).map((r: { from_user_id: string; to_user_id: string }) =>
          r.from_user_id === userId ? r.to_user_id : r.from_user_id
        )
      )
      if (friendIds.size === 0) return NextResponse.json([])

      const { data: users, error: usersErr } = await adminClient
        .from('users')
        .select('id, username, avatar_url, bio')
        .in('id', [...friendIds])

      if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 })
      return NextResponse.json(users || [])
    } else {
      const { data: rows, error } = await adminClient
        .from('followers')
        .select('following_id')
        .eq('follower_id', userId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const followingIds = (rows || []).map((r: { following_id: string }) => r.following_id)
      if (followingIds.length === 0) return NextResponse.json([])

      const { data: users, error: usersErr } = await adminClient
        .from('users')
        .select('id, username, avatar_url, bio')
        .in('id', followingIds)
      if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 })
      return NextResponse.json(users || [])
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
