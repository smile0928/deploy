import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

/** Remove a friend (delete accepted friend_request). Does not change the followers table. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: otherUserId } = await params
    if (!otherUserId) return NextResponse.json({ error: 'User ID required' }, { status: 400 })

    const { data: rows, error: fetchErr } = await adminClient
      .from('friend_requests')
      .select('id, from_user_id, to_user_id')
      .eq('status', 'accepted')
      .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${user.id})`)

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    if (!rows?.length) return NextResponse.json({ error: 'Not friends' }, { status: 404 })

    const { error: deleteErr } = await adminClient
      .from('friend_requests')
      .delete()
      .in('id', rows.map((r: { id: string }) => r.id))

    if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 })

    const { data: removerUser } = await adminClient
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single()
    const removerName = removerUser?.username || 'Someone'
    await adminClient.from('notifications').insert({
      user_id: otherUserId,
      sender_id: user.id,
      notification_type: 'friend_removed',
      title: `${removerName} removed you from friends`,
      message: '',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unfriend error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
