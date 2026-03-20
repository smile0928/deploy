import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get posts without filtering
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, content, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Check UUID validity
    const analysis = posts.map((post: any) => {
      const hasValidId = post.id && post.id !== 'undefined' && typeof post.id === 'string' && post.id.trim() !== ''
      return {
        id: post.id,
        idType: typeof post.id,
        idLength: post.id?.length,
        hasValidId,
        content: post.content?.substring(0, 50) || '[no content]',
      }
    })

    return NextResponse.json({
      totalPosts: posts.length,
      validPosts: analysis.filter(p => p.hasValidId).length,
      invalidPosts: analysis.filter(p => !p.hasValidId).length,
      posts: analysis,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Diagnostic failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
