import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Get all users
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, username, avatar_url, bio')
      .neq('id', user?.id || '')
      .limit(50)

    if (usersError) {
      // If users table is missing, just return empty list instead of demo data
      if (usersError.message?.includes('does not exist')) {
        return NextResponse.json([])
      }
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    const usersToReturn = allUsers || []

    // If user is logged in, add follow status to each user
    if (user) {
      const { data: following, error: followingError } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id)

      if (followingError) {
        // If followers table doesn't exist, just return users without follow status
        if (followingError.message?.includes('does not exist')) {
          return NextResponse.json(usersToReturn)
        }
        // Log the error but still return users
        console.error('Followers query error:', followingError)
      }

      const followingIds = following?.map((f: any) => f.following_id) || []

      // Add follow status to each user
      const usersWithStatus = usersToReturn.map((u: any) => ({
        ...u,
        isFollowing: followingIds.includes(u.id),
      }))

      return NextResponse.json(usersWithStatus)
    }

    // Return users without follow status if not authenticated
    return NextResponse.json(usersToReturn)
  } catch (error) {
    console.error('Discover error:', error)
    // On error, do not return demo users; keep list empty
    return NextResponse.json([])
  }
}

