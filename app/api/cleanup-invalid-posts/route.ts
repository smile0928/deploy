import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createAdminClient()

    // Get all posts
    const { data: posts, error: getError } = await supabase
      .from('posts')
      .select('id')

    if (getError) {
      return NextResponse.json({ error: getError.message }, { status: 500 })
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No posts to clean up',
        deletedCount: 0,
      })
    }

    // Find posts with invalid IDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const invalidIds = posts
      .filter((post: any) => !post.id || post.id === 'undefined' || !uuidRegex.test(post.id))
      .map((post: any) => post.id)

    if (invalidIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No invalid posts found',
        deletedCount: 0,
      })
    }

    // Delete posts with invalid IDs
    let deletedCount = 0
    
    for (const id of invalidIds) {
      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)

      if (!deleteError) {
        deletedCount++
      } else {
        console.error(`Failed to delete post ${id}:`, deleteError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} invalid posts`,
      deletedCount,
      invalidIds,
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
