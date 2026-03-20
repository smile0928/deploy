import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

/** Returns set of user ids who are accepted friends (friend_requests status=accepted) with userId */
async function getFriendIds(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  userId: string
): Promise<Set<string>> {
  const { data: rows } = await adminClient
    .from('friend_requests')
    .select('from_user_id, to_user_id')
    .eq('status', 'accepted')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
  return new Set(
    (rows || []).map((r: { from_user_id: string; to_user_id: string }) =>
      r.from_user_id === userId ? r.to_user_id : r.from_user_id
    )
  )
}

/** Get users to suggest: not self, not already friends, with mutual_friends_count. Optionally include "loves" from posts. */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const myFriendIds = await getFriendIds(adminClient, user.id)
    const { data: followingRows } = await adminClient
      .from('followers')
      .select('following_id')
      .eq('follower_id', user.id)
    const followingIds = new Set((followingRows || []).map((r: { following_id: string }) => r.following_id))

    // Exclude self, current friends, and people already requested
    const { data: pendingSent } = await adminClient
      .from('friend_requests')
      .select('to_user_id')
      .eq('from_user_id', user.id)
      .eq('status', 'pending')
    const pendingSentIds = new Set((pendingSent || []).map((r: { to_user_id: string }) => r.to_user_id))

    const excludeIds = new Set([user.id, ...myFriendIds, ...followingIds, ...pendingSentIds])

    // Users I follow (not yet friends) — include them in Suggestions
    const followingNotFriendIds = [...followingIds].filter((id) => !myFriendIds.has(id))
    let followingSuggestions: { id: string; username: string; display_name: string; avatar_url?: string; bio?: string; mutual_friends_count: number; loves: string }[] = []
    if (followingNotFriendIds.length > 0) {
      const { data: followingUsers } = await adminClient
        .from('users')
        .select('id, username, avatar_url, bio')
        .in('id', followingNotFriendIds)
      const followingMutual = await Promise.all(
        (followingUsers || []).map(async (u: { id: string; username: string; avatar_url?: string; bio?: string }) => {
          const theirFriendIds = await getFriendIds(adminClient, u.id)
          const mutualCount = [...myFriendIds].filter((fid) => theirFriendIds.has(fid)).length
          return { ...u, mutualCount }
        })
      )
      const { data: followingPosts } = await adminClient
        .from('posts')
        .select('user_id, anime_tags')
        .in('user_id', followingNotFriendIds)
        .not('anime_tags', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200)
      const followingLoves: Record<string, string> = {}
      const seen = new Set<string>()
      for (const p of followingPosts || []) {
        const uid = (p as { user_id: string; anime_tags: string | string[] }).user_id
        if (seen.has(uid)) continue
        seen.add(uid)
        const tags = (p as { anime_tags: string | string[] }).anime_tags
        const first = Array.isArray(tags) ? tags[0] : typeof tags === 'string' ? tags.split(',')[0]?.trim() : null
        if (first) followingLoves[uid] = first
      }
      followingSuggestions = followingMutual.map((u: { id: string; username: string; avatar_url?: string; bio?: string; mutualCount: number }) => ({
        id: u.id,
        username: u.username,
        display_name: u.username.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        avatar_url: u.avatar_url,
        bio: u.bio,
        mutual_friends_count: u.mutualCount,
        loves: followingLoves[u.id] || 'Anime',
      }))
    }

    const { data: allUsers, error: usersError } = await adminClient
      .from('users')
      .select('id, username, avatar_url, bio')
      .neq('id', user.id)
      .limit(100)

    if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 })

    const candidates = (allUsers || []).filter((u: { id: string }) => !excludeIds.has(u.id))
    if (candidates.length === 0) return NextResponse.json(followingSuggestions)

    const candidateIds = candidates.map((c: { id: string }) => c.id)

    // Get each candidate's friend set for mutual count
    const suggestions = await Promise.all(
      candidateIds.map(async (id: string) => {
        const theirFriendIds = await getFriendIds(adminClient, id)
        const mutualCount = [...myFriendIds].filter((fid) => theirFriendIds.has(fid)).length
        return { id, mutualCount }
      })
    )
    const mutualById = Object.fromEntries(suggestions.map((s) => [s.id, s.mutualCount]))

    // Optional: get a "loves" from user's most recent post with anime_tags
    const { data: postsWithTags } = await adminClient
      .from('posts')
      .select('user_id, anime_tags')
      .in('user_id', candidateIds)
      .not('anime_tags', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500)

    const lovesByUserId: Record<string, string> = {}
    const seen = new Set<string>()
    for (const p of postsWithTags || []) {
      const uid = (p as { user_id: string; anime_tags: string | string[] }).user_id
      if (seen.has(uid)) continue
      seen.add(uid)
      const tags = (p as { anime_tags: string | string[] }).anime_tags
      const first = Array.isArray(tags) ? tags[0] : typeof tags === 'string' ? tags.split(',')[0]?.trim() : null
      if (first) lovesByUserId[uid] = first
    }

    const result = candidates.map((u: { id: string; username: string; avatar_url?: string; bio?: string }) => ({
      id: u.id,
      username: u.username,
      display_name: u.username.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      avatar_url: u.avatar_url,
      bio: u.bio,
      mutual_friends_count: mutualById[u.id] ?? 0,
      loves: lovesByUserId[u.id] || 'Anime',
    }))

    // Sort by mutual count descending, then by username
    result.sort((a, b) => b.mutual_friends_count - a.mutual_friends_count || a.username.localeCompare(b.username))

    // Prepend users I follow so they appear first in Suggestions
    return NextResponse.json([...followingSuggestions, ...result])
  } catch (error) {
    console.error('Suggestions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
