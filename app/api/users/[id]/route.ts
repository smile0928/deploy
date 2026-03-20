import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, full_name, avatar_url, cover_url, bio, location, website, created_at')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const admin = createAdminClient()
    const [postsRes, followersRes, followingRes] = await Promise.all([
      admin.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', id).or('type.is.null,type.neq.anime'),
      admin.from('followers').select('id', { count: 'exact', head: true }).eq('following_id', id),
      admin.from('followers').select('id', { count: 'exact', head: true }).eq('follower_id', id),
    ])
    const posts_count = postsRes.count ?? 0
    const followers_count = followersRes.count ?? 0
    const following_count = followingRes.count ?? 0

    return NextResponse.json({
      ...data,
      posts_count,
      followers_count,
      following_count,
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
