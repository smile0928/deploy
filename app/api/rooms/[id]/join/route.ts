import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

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

    const { error } = await adminClient
      .from('room_members')
      .insert({
        room_id: roomId,
        user_id: user.id,
        is_admin: false,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: true, already_member: true })
      }
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'room_members table missing. Run migration 007_create_room_members.sql in Supabase SQL Editor.' },
          { status: 500 }
        )
      }
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Room not found or invalid. Check room_id matches rooms.id (UUID).' },
          { status: 400 }
        )
      }
      if (error.code === '22P02' || error.message?.includes('invalid input syntax')) {
        return NextResponse.json(
          { error: 'room_members has wrong schema (room_id must be UUID). Run: DROP TABLE room_members CASCADE; then run 007_create_room_members.sql' },
          { status: 500 }
        )
      }
      console.error('Join room error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to join room', code: error.code },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Join room error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
