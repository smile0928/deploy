import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

/** Withdraw a sent friend request (delete pending). Only the sender can withdraw. Notifies the recipient. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { data: row, error: fetchErr } = await adminClient
      .from('friend_requests')
      .select('id, from_user_id, to_user_id')
      .eq('id', id)
      .eq('from_user_id', user.id)
      .eq('status', 'pending')
      .single()

    if (fetchErr || !row) return NextResponse.json({ error: 'Request not found or cannot withdraw' }, { status: 404 })

    const toUserId = (row as { to_user_id: string }).to_user_id
    const { error: deleteErr } = await adminClient
      .from('friend_requests')
      .delete()
      .eq('id', id)

    if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 })

    const { data: senderUser } = await adminClient
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single()
    const senderName = senderUser?.username || 'Someone'
    await adminClient.from('notifications').insert({
      user_id: toUserId,
      sender_id: user.id,
      notification_type: 'friend_request_withdrawn',
      title: `${senderName} withdrew their friend request`,
      message: '',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Withdraw friend request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
