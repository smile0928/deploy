import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Try with event_interested first (full data)
    let rawEvents: any[] | null = null
    let error: { message: string } | null = null

    const res = await adminClient
      .from('events')
      .select(`
        *,
        event_attendees (id, user_id),
        event_interested (id, user_id)
      `)
      .order('event_date', { ascending: true })
      .limit(50)

    rawEvents = res.data
    error = res.error

    // If permission denied on event_interested, fall back to events + event_attendees only
    if (error?.message?.includes('event_interested')) {
      const fallback = await adminClient
        .from('events')
        .select(`
          *,
          event_attendees (id, user_id)
        `)
        .order('event_date', { ascending: true })
        .limit(50)
      rawEvents = fallback.data
      error = fallback.error
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const userId = user?.id ?? null
    const events = (rawEvents ?? []).map((e: { event_attendees?: { user_id: string }[]; event_interested?: { user_id: string }[] }) => {
      const { event_attendees: attendees, event_interested: interested, ...rest } = e
      return {
        ...rest,
        attendee_count: attendees?.length ?? 0,
        interested_count: interested?.length ?? 0,
        is_attending: userId ? attendees?.some((a: { user_id: string }) => a.user_id === userId) : false,
        is_interested: userId ? interested?.some((i: { user_id: string }) => i.user_id === userId) : false,
      }
    })

    return NextResponse.json(events)
  } catch (error) {
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
    const { title, description, anime_theme, event_date, location, is_virtual, image_url, category } = body

    if (!title || !event_date) {
      return NextResponse.json(
        { error: 'Title and event date are required' },
        { status: 400 }
      )
    }

    const { data, error } = await adminClient
      .from('events')
      .insert([
        {
          creator_id: user.id,
          title,
          description: description || null,
          anime_theme: anime_theme || null,
          event_date,
          location: location || null,
          is_virtual: is_virtual || false,
          image_url: image_url || null,
          category: category || null,
        },
      ])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add creator as attendee using admin client
    await adminClient
      .from('event_attendees')
      .insert([
        {
          event_id: data.id,
          user_id: user.id,
        },
      ])

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
