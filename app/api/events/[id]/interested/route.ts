import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CRITICAL: params is a Promise in Next.js 16, must await it!
    const { id: eventId } = await params

    // Reject undefined/invalid IDs
    if (!eventId || eventId === 'undefined' || eventId === '') {
      console.error('❌ Invalid eventId:', eventId)
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log('User from auth:', { userId: user?.id, email: user?.email, authenticated: !!user })

    if (!user) {
      console.error('❌ No authenticated user!')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ User authenticated, processing interested...')

    // Verify user exists first
    const { data: userExists, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (userCheckError) {
      console.error('User check error:', userCheckError)
    }

    const adminClient = createAdminClient()

    if (!userExists) {
      console.log('Creating user profile...')
      const { error: userCreateError } = await adminClient
        .from('users')
        .insert([
          {
            id: user.id,
            email: user.email || '',
            username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
            full_name: user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
          },
        ])

      if (userCreateError && userCreateError.code !== '23505') {
        console.error('User creation error:', userCreateError)
      }
    }

    // Check if already interested (use admin client to avoid RLS permission denied)
    const { data: existingInterest, error: existingError } = await adminClient
      .from('event_interested')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing interest:', existingError)
      return NextResponse.json(
        { error: 'Failed to check interest status: ' + existingError.message },
        { status: 500 }
      )
    }

    if (existingInterest) {
      // Remove interest
      const { error } = await adminClient
        .from('event_interested')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Remove interest error:', error)
        return NextResponse.json(
          { error: 'Failed to remove interest: ' + error.message },
          { status: 500 }
        )
      }

      const { count } = await adminClient
        .from('event_interested')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)

      const newCount = count ?? 0
      await adminClient
        .from('events')
        .update({ interested_count: newCount })
        .eq('id', eventId)

      return NextResponse.json({
        is_interested: false,
        interested_count: newCount,
      })
    } else {
      // Add interest
      const { error } = await adminClient
        .from('event_interested')
        .insert([
          { event_id: eventId, user_id: user.id },
        ])

      if (error) {
        console.error('Interest error:', error, { eventId, userId: user.id })
        if (error.code === '23503') {
          return NextResponse.json(
            { error: 'Event not found or user does not exist' },
            { status: 404 }
          )
        }
        return NextResponse.json(
          { error: 'Failed to mark interested: ' + error.message },
          { status: 500 }
        )
      }

      const { count } = await adminClient
        .from('event_interested')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)

      const newCount = count ?? 0
      await adminClient
        .from('events')
        .update({ interested_count: newCount })
        .eq('id', eventId)

      // Notify event creator (if not own event)
      const { data: eventRow } = await adminClient
        .from('events')
        .select('creator_id')
        .eq('id', eventId)
        .maybeSingle()

      if (eventRow?.creator_id && eventRow.creator_id !== user.id) {
        await adminClient
          .from('notifications')
          .insert([
            {
              user_id: eventRow.creator_id,
              sender_id: user.id,
              notification_type: 'like',
              title: 'Someone is interested in your event',
              message: null,
            },
          ])
      }

      return NextResponse.json(
        { is_interested: true, interested_count: newCount },
        { status: 201 }
      )
    }
  } catch (error) {
    console.error('Interested endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
