import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createAdminClient()

    console.log('🔍 Running Supabase diagnostics...')

    // Test direct query
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .limit(1)

    if (error) {
      const errorMsg = error.message

      return NextResponse.json({
        status: 'DIAGNOSTIC REPORT',
        error: errorMsg,
        diagnosis: 'TABLE-LEVEL PERMISSION DENIED',
        cause: 'Your Supabase tables do not have proper SELECT grants',
        solution: 'Run this SQL in Supabase Console → SQL Editor',
        sql_to_run: [
          'GRANT SELECT ON posts TO authenticated;',
          'GRANT SELECT ON comments TO authenticated;',
          'GRANT SELECT ON post_likes TO authenticated;',
          'GRANT SELECT ON users TO authenticated;',
          'GRANT SELECT ON profiles TO authenticated;',
          'GRANT SELECT ON followers TO authenticated;',
          'GRANT SELECT ON events TO authenticated;',
          'GRANT SELECT ON event_attendees TO authenticated;',
          'GRANT SELECT ON rooms TO authenticated;',
          'GRANT SELECT ON room_members TO authenticated;',
          'GRANT SELECT ON messages TO authenticated;',
        ],
        steps: [
          '1. Go to: https://app.supabase.com → Your Project',
          '2. Click: SQL Editor (left sidebar)',
          '3. Click: New Query',
          '4. Copy all the GRANT commands above',
          '5. Paste them into the editor',
          '6. Click: Run',
          '7. Refresh your app',
        ]
      }, { status: 400 })
    }

    return NextResponse.json({
      status: 'OK',
      message: '✅ Tables are accessible!',
      postsCount: data?.length || 0,
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'FAILED',
    }, { status: 500 })
  }
}
