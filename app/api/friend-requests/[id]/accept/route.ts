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
    const { data: req, error: fetchErr } = await adminClient
      .from('friend_requests')
      .select('id, from_user_id, to_user_id')
      .eq('id', id)
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .single()

    if (fetchErr || !req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    await adminClient.from('friend_requests').update({ status: 'accepted' }).eq('id', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Accept error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
