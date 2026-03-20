import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated', user: null }, { status: 401 })
    }

    // Check user exists in users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    // Check if user can insert likes
    const { data: testLike, error: likesTestError } = await supabase
      .from('post_likes')
      .select('id')
      .limit(1)

    // Check if user can insert comments
    const { data: testComments, error: commentsTestError } = await supabase
      .from('comments')
      .select('id')
      .limit(1)

    // Check if there are any posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, user_id')
      .limit(5)

    // Return debug info
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      },
      userProfile: userData || null,
      userProfileError: userError?.message || null,
      postsCount: posts?.length || 0,
      postsError: postsError?.message || null,
      canReadLikes: !likesTestError,
      canReadComments: !commentsTestError,
      debug: {
        likesError: likesTestError?.message || null,
        commentsError: commentsTestError?.message || null,
      },
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      {
        error: 'Debug endpoint error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
