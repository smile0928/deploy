import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { id: roomId } = await params

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID required' }, { status: 400 })
    }

    const { data, error } = await adminClient
      .from('messages')
      .select('id, sender_id, content, image_url, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      console.error('Room messages error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const senderIds = [...new Set((data || []).map((m: any) => m.sender_id).filter(Boolean))]
    const usersMap: Record<string, { username: string; avatar_url?: string }> = {}
    if (senderIds.length > 0) {
      const { data: users } = await adminClient
        .from('users')
        .select('id, username, avatar_url')
        .in('id', senderIds)
      for (const u of users || []) {
        usersMap[u.id] = { username: u.username, avatar_url: u.avatar_url }
      }
    }

    const messages = (data || []).map((m: any) => ({
      id: m.id,
      sender_id: m.sender_id,
      content: m.content,
      image_url: m.image_url,
      created_at: m.created_at,
      username: usersMap[m.sender_id]?.username || 'Unknown',
      avatar_url: usersMap[m.sender_id]?.avatar_url,
    }))

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Room messages error:', error)
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
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: roomId } = await params

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID required' }, { status: 400 })
    }

    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    const { data: member } = await adminClient
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!member) {
      return NextResponse.json(
        { error: 'You must join the room before sending messages' },
        { status: 403 }
      )
    }

    const { data, error } = await adminClient
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: user.id,
        content: content.trim(),
      })
      .select()
      .single()

    if (error) {
      console.error('Send room message error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Send room message error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
