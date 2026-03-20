import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    console.log('🔍 Current user:', user?.id)

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        message: 'NOT AUTHENTICATED - User must be logged in to like/comment',
        userId: null,
      })
    }

    // Check if user profile exists
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    console.log('👤 User profile:', profile?.username)

    // Get posts with their likes
    const { data: posts } = await supabase
      .from('posts')
      .select('id, content, likes_count')
      .limit(3)

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      userEmail: user.email,
      profileExists: !!profile,
      username: profile?.username,
      posts: posts?.map(p => ({
        id: p.id,
        content: p.content?.substring(0, 40),
        likes_count: p.likes_count,
      })) || [],
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Debug failed' },
      { status: 500 }
    )
  }
}
