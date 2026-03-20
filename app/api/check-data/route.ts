import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createAdminClient()

    console.log('🔍 Checking actual data in database...')

    // Use admin client which bypasses RLS
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .limit(10)

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .limit(10)

    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .limit(10)

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(10)

    return NextResponse.json({
      status: 'Database Content Check',
      data: {
        posts: {
          count: posts?.length || 0,
          error: postsError?.message,
          sample: posts?.[0],
        },
        events: {
          count: events?.length || 0,
          error: eventsError?.message,
          sample: events?.[0],
        },
        rooms: {
          count: rooms?.length || 0,
          error: roomsError?.message,
          sample: rooms?.[0],
        },
        users: {
          count: users?.length || 0,
          error: usersError?.message,
          sample: users?.[0],
        },
      },
      note: 'Admin client bypasses RLS - shows actual data in database',
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
