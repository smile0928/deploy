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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { data: row } = await adminClient
      .from('friend_requests')
      .select('from_user_id')
      .eq('id', id)
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .single()

    if (!row) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    const { error } = await adminClient
      .from('friend_requests')
      .update({ status: 'declined' })
      .eq('id', id)
      .eq('to_user_id', user.id)
      .eq('status', 'pending')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const senderId = (row as { from_user_id: string }).from_user_id
    const { data: declinerUser } = await adminClient
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single()
    const declinerName = declinerUser?.username || 'Someone'
    await adminClient.from('notifications').insert({
      user_id: senderId,
      sender_id: user.id,
      notification_type: 'friend_request_declined',
      title: `${declinerName} declined your friend request`,
      message: '',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Decline error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
