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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const type = request.nextUrl.searchParams.get('type') || 'all' // all, sent, incoming

    if (type === 'sent') {
      const { data: rows, error } = await adminClient
        .from('friend_requests')
        .select('id, to_user_id, status, created_at')
        .eq('from_user_id', user.id)
        .eq('status', 'pending')

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const ids = (rows || []).map((r: { to_user_id: string }) => r.to_user_id)
      if (ids.length === 0) return NextResponse.json([])

      const { data: users } = await adminClient.from('users').select('id, username, avatar_url, bio').in('id', ids)
      const usersMap = Object.fromEntries((users || []).map((u: { id: string }) => [u.id, u]))
      return NextResponse.json((rows || []).map((r: { id: string; to_user_id: string }) => ({
        id: r.id,
        user_id: r.to_user_id,
        username: usersMap[r.to_user_id]?.username || 'Unknown',
        avatar_url: usersMap[r.to_user_id]?.avatar_url,
        status: 'sent',
        mutual_friends_count: 0,
      })))
    }

    if (type === 'incoming') {
      const { data: rows, error } = await adminClient
        .from('friend_requests')
        .select('id, from_user_id, status, created_at')
        .eq('to_user_id', user.id)
        .eq('status', 'pending')

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const ids = (rows || []).map((r: { from_user_id: string }) => r.from_user_id)
      if (ids.length === 0) return NextResponse.json([])

      const { data: users } = await adminClient.from('users').select('id, username, avatar_url, bio').in('id', ids)
      const usersMap = Object.fromEntries((users || []).map((u: { id: string }) => [u.id, u]))
      const myFriendIds = await getFriendIds(adminClient, user.id)
      const result = await Promise.all(
        (rows || []).map(async (r: { id: string; from_user_id: string }) => {
          const requesterFriendIds = await getFriendIds(adminClient, r.from_user_id)
          const mutual = [...myFriendIds].filter((id) => requesterFriendIds.has(id)).length
          return {
            id: r.id,
            user_id: r.from_user_id,
            username: usersMap[r.from_user_id]?.username || 'Unknown',
            avatar_url: usersMap[r.from_user_id]?.avatar_url,
            status: 'incoming',
            mutual_friends_count: mutual,
          }
        })
      )
      return NextResponse.json(result)
    }

    const [sentRes, incomingRes] = await Promise.all([
      adminClient.from('friend_requests').select('id, to_user_id, status').eq('from_user_id', user.id).eq('status', 'pending'),
      adminClient.from('friend_requests').select('id, from_user_id, status').eq('to_user_id', user.id).eq('status', 'pending'),
    ])

    const sentIds = (sentRes.data || []).map((r: { to_user_id: string }) => r.to_user_id)
    const incomingIds = (incomingRes.data || []).map((r: { from_user_id: string }) => r.from_user_id)
    const allIds = [...new Set([...sentIds, ...incomingIds])]
    if (allIds.length === 0) return NextResponse.json([])

    const { data: users } = await adminClient.from('users').select('id, username, avatar_url, bio').in('id', allIds)
    const usersMap = Object.fromEntries((users || []).map((u: { id: string }) => [u.id, u]))

    const sent = (sentRes.data || []).map((r: { id: string; to_user_id: string }) => ({
      id: r.id,
      user_id: r.to_user_id,
      username: usersMap[r.to_user_id]?.username || 'Unknown',
      avatar_url: usersMap[r.to_user_id]?.avatar_url,
      status: 'sent',
      mutual_friends_count: 0,
    }))
    const myFriendIdsAll = await getFriendIds(adminClient, user.id)
    const incoming = await Promise.all(
      (incomingRes.data || []).map(async (r: { id: string; from_user_id: string }) => {
        const requesterFriendIds = await getFriendIds(adminClient, r.from_user_id)
        const mutual = [...myFriendIdsAll].filter((id) => requesterFriendIds.has(id)).length
        return {
          id: r.id,
          user_id: r.from_user_id,
          username: usersMap[r.from_user_id]?.username || 'Unknown',
          avatar_url: usersMap[r.from_user_id]?.avatar_url,
          status: 'incoming',
          mutual_friends_count: mutual,
        }
      })
    )
    return NextResponse.json([...incoming, ...sent])
  } catch (error) {
    console.error('Friend requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { to_user_id } = body
    if (!to_user_id) return NextResponse.json({ error: 'to_user_id required' }, { status: 400 })
    if (to_user_id === user.id) return NextResponse.json({ error: 'Cannot send request to yourself' }, { status: 400 })

    const { data: existing } = await adminClient
      .from('friend_requests')
      .select('id, status')
      .eq('from_user_id', user.id)
      .eq('to_user_id', to_user_id)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'pending') return NextResponse.json({ error: 'Request already sent' }, { status: 400 })
      if (existing.status === 'accepted') return NextResponse.json({ error: 'Already friends' }, { status: 400 })
      if (existing.status === 'declined') {
        const { data: updated, error: updateErr } = await adminClient
          .from('friend_requests')
          .update({ status: 'pending', created_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single()
        if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
        const { data: targetUser } = await adminClient
          .from('users')
          .select('id, username, avatar_url')
          .eq('id', to_user_id)
          .single()
        const { data: senderUser } = await adminClient
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single()
        const senderName = senderUser?.username || 'Someone'
        await adminClient
          .from('notifications')
          .insert({
            user_id: to_user_id,
            sender_id: user.id,
            notification_type: 'friend_request',
            title: `${senderName} sent you a friend request`,
            message: '',
          })
        return NextResponse.json({
          id: updated.id,
          user_id: to_user_id,
          username: targetUser?.username || 'Unknown',
          avatar_url: targetUser?.avatar_url,
          status: 'sent',
          mutual_friends_count: 0,
        }, { status: 201 })
      }
    }

    const { data, error } = await adminClient
      .from('friend_requests')
      .insert({ from_user_id: user.id, to_user_id, status: 'pending' })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Request already sent' }, { status: 400 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: targetUser } = await adminClient
      .from('users')
      .select('id, username, avatar_url')
      .eq('id', to_user_id)
      .single()

    const { data: senderUser } = await adminClient
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single()

    const senderName = senderUser?.username || 'Someone'
    await adminClient
      .from('notifications')
      .insert({
        user_id: to_user_id,
        sender_id: user.id,
        notification_type: 'friend_request',
        title: `${senderName} sent you a friend request`,
        message: '',
      })

    return NextResponse.json({
      id: data.id,
      user_id: to_user_id,
      username: targetUser?.username || 'Unknown',
      avatar_url: targetUser?.avatar_url,
      status: 'sent',
      mutual_friends_count: 0,
    }, { status: 201 })
  } catch (error) {
    console.error('Friend request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
