import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// All known seed/demo user IDs from seed-users, seed-demo, seed-quick, create-test-data
const SEED_USER_IDS = [
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '550e8400-0000-4000-a000-000000000001',
  '550e8400-0000-4000-a000-000000000002',
  '550e8400-0000-4000-a000-000000000003',
  '550e8400-e29b-41d4-a716-446655440001',
]

async function safeDelete(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  table: string,
  column: string
) {
  try {
    await (admin as any).from(table).delete().in(column, SEED_USER_IDS)
  } catch {
    // Table or column may not exist
  }
}

export async function POST() {
  try {
    const admin = createAdminClient()

    // Delete in dependency order to avoid FK violations
    await safeDelete(admin, 'posts', 'user_id')
    await safeDelete(admin, 'comments', 'user_id')
    await safeDelete(admin, 'post_likes', 'user_id')
    await safeDelete(admin, 'followers', 'follower_id')
    await safeDelete(admin, 'followers', 'following_id')
    await safeDelete(admin, 'event_attendees', 'user_id')
    await safeDelete(admin, 'events', 'creator_id')
    await safeDelete(admin, 'room_members', 'user_id')
    await safeDelete(admin, 'rooms', 'creator_id')
    await safeDelete(admin, 'messages', 'sender_id')
    await safeDelete(admin, 'messages', 'recipient_id')
    await safeDelete(admin, 'notifications', 'user_id')
    await safeDelete(admin, 'notifications', 'related_user_id')

    const { data: deletedUsers, error: usersErr } = await admin
      .from('users')
      .delete()
      .in('id', SEED_USER_IDS)
      .select('id')

    if (usersErr) {
      return NextResponse.json({ success: false, error: usersErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Seed data deleted. Only real users remain.',
      deleted: deletedUsers?.length ?? 0,
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
