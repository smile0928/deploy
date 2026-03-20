import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await adminClient
      .from('rooms')
      .select(`
        id,
        creator_id,
        name,
        description,
        image_url,
        topic,
        is_public,
        created_at,
        updated_at,
        room_members (id, user_id)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Rooms fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const creatorIds = [...new Set((data || []).map((r: any) => r.creator_id).filter(Boolean))]
    const creatorsMap: Record<string, { avatar_url?: string; username?: string }> = {}
    if (creatorIds.length > 0) {
      const { data: creators } = await adminClient
        .from('users')
        .select('id, avatar_url, username')
        .in('id', creatorIds)
      for (const c of creators || []) {
        creatorsMap[c.id] = { avatar_url: c.avatar_url, username: c.username }
      }
    }

    const roomIds = (data || []).map((r: any) => r.id)
    const messageCounts: Record<string, number> = {}
    if (roomIds.length > 0) {
      const { data: msgData } = await adminClient
        .from('messages')
        .select('room_id')
        .in('room_id', roomIds)
      for (const m of msgData || []) {
        if (m?.room_id) {
          messageCounts[m.room_id] = (messageCounts[m.room_id] || 0) + 1
        }
      }
    }

    const transformedRooms = (data || []).map((room: any) => {
      const members = room.room_members || []
      const is_member = user ? members.some((m: any) => m.user_id === user.id) : false
      const creator = room.creator_id ? creatorsMap[room.creator_id] : null
      return {
        ...room,
        member_count: members.length,
        online_count: 0,
        message_count: messageCounts[room.id] || 0,
        is_member,
        creator_avatar_url: creator?.avatar_url,
        creator_username: creator?.username,
      }
    })

    return NextResponse.json(transformedRooms)
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
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, image_url, topic, is_public } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      )
    }

    // First check if user exists, if not create them
    const { data: existingUser, error: userCheckError } = await adminClient
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

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

      if (userCreateError && userCreateError.code !== 'PGRST301') {
        console.error('Failed to create user:', userCreateError)
      }
    }

    const { data, error } = await adminClient
      .from('rooms')
      .insert([
        {
          creator_id: user.id,
          name: name.trim(),
          description: description && description.trim().length > 0 ? description.trim() : null,
          image_url: image_url || null,
          topic: topic && topic.trim().length > 0 ? topic.trim() : null,
          is_public: is_public !== false,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Room creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add creator as room member and admin using admin client
    const { error: memberError } = await adminClient
      .from('room_members')
      .insert([
        {
          room_id: data.id,
          user_id: user.id,
          is_admin: true,
        },
      ])

    if (memberError) {
      console.error('Failed to add room member:', memberError)
      // Room was created, but member addition failed - continue anyway
    }

    return NextResponse.json({ ...data, member_count: 1 }, { status: 201 })
  } catch (error) {
    console.error('POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
