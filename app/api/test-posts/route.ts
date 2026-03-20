import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get all posts directly
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, content, user_id, created_at')
      .limit(10)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      totalPosts: posts?.length || 0,
      posts: posts?.map(p => ({
        id: p.id,
        idType: typeof p.id,
        idLength: p.id?.length,
        content: p.content?.substring(0, 50) || '[no content]',
        user_id: p.user_id,
        created_at: p.created_at,
      })) || [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 }
    )
  }
}
