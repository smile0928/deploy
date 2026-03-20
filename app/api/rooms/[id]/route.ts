import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
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

    const { data: room, error: fetchError } = await adminClient
      .from('rooms')
      .select('id, creator_id')
      .eq('id', roomId)
      .single()

    if (fetchError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (String(room.creator_id) !== String(user.id)) {
      return NextResponse.json(
        { error: 'Only the room creator can delete this room' },
        { status: 403 }
      )
    }

    const { error: membersError } = await adminClient
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
    if (membersError) console.warn('room_members delete:', membersError)

    const { error: messagesError } = await adminClient
      .from('messages')
      .delete()
      .eq('room_id', roomId)
    if (messagesError) console.warn('messages delete:', messagesError)

    const { error: deleteError } = await adminClient
      .from('rooms')
      .delete()
      .eq('id', roomId)

    if (deleteError) {
      console.error('Delete room error:', deleteError)
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete room' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete room error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
