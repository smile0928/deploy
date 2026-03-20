import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

/** GET: Top 3 users by follower count, sorted decreasing, excluding users with 0 followers. */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: rows, error } = await admin
      .from('followers')
      .select('following_id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Count followers per user (following_id = user being followed)
    const countByUserId: Record<string, number> = {}
    for (const row of rows || []) {
      const id = (row as { following_id: string }).following_id
      countByUserId[id] = (countByUserId[id] ?? 0) + 1
    }

    // Sort by count descending, exclude 0 (already excluded since we only have ids with ≥1), take top 3
    const topIds = Object.entries(countByUserId)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([id]) => id)

    if (topIds.length === 0) {
      return NextResponse.json([])
    }

    const { data: users, error: usersError } = await admin
      .from('users')
      .select('id, username, avatar_url, bio')
      .in('id', topIds)

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    // Preserve order by follower count and attach count
    const ordered = topIds
      .map((id) => {
        const u = (users || []).find((x: { id: string }) => x.id === id)
        if (!u) return null
        return { ...u, followers_count: countByUserId[id] ?? 0 }
      })
      .filter(Boolean)

    return NextResponse.json(ordered)
  } catch (error) {
    console.error('Top followers error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
