import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createAdminClient()

    console.log('🔍 Running comprehensive diagnostic and fix...')

    // Step 1: Check if tables exist
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_names')
      .catch(() => ({ data: null, error: 'RPC not available' }))

    // Step 2: Try to get posts directly
    const { data: postsTest, error: postsTestError } = await supabase
      .from('posts')
      .select('id')
      .limit(1)

    if (postsTestError && postsTestError.message.includes('permission denied')) {
      console.error('❌ Permission Denied - Tables may not exist or grants are missing')

      return NextResponse.json({
        status: 'DIAGNOSTIC',
        error: 'Permission Denied for Posts Table',
        message: 'Your Supabase tables need proper permissions configured',
        cause: 'The authenticated role does not have SELECT grants on tables',
        solution: 'MANUAL FIX REQUIRED - Follow these steps:',
        steps: [
          '1. Open your Supabase Dashboard: https://app.supabase.com',
          '2. Select your project',
          '3. Go to: Authentication → Policies (in left sidebar)',
          '4. OR Go to: SQL Editor',
          '5. Create a new query',
          '6. Run the SQL commands provided below',
        ],
        critical_sql: [
          '-- First, make sure tables exist by checking schema',
          'SELECT table_name FROM information_schema.tables WHERE table_schema = "public";',
          '',
          '-- If tables exist, grant permissions:',
          'GRANT SELECT ON posts TO authenticated;',
          'GRANT SELECT ON comments TO authenticated;',
          'GRANT SELECT ON post_likes TO authenticated;',
          'GRANT SELECT ON users TO authenticated;',
          'GRANT SELECT ON messages TO authenticated;',
          'GRANT SELECT ON events TO authenticated;',
          'GRANT SELECT ON rooms TO authenticated;',
          '',
          '-- Grant write permissions:',
          'GRANT INSERT ON posts TO authenticated;',
          'GRANT INSERT ON comments TO authenticated;',
          'GRANT INSERT ON post_likes TO authenticated;',
          'GRANT UPDATE ON posts TO authenticated;',
          'GRANT UPDATE ON comments TO authenticated;',
          'GRANT DELETE ON posts TO authenticated;',
          'GRANT DELETE ON comments TO authenticated;',
          'GRANT DELETE ON post_likes TO authenticated;',
        ],
        alternative: 'If tables don\'t exist, you need to create them in Supabase schema',
        verification_url: 'After running SQL, test at: /api/test-db',
      }, { status: 400 })
    }

    if (postsTestError) {
      return NextResponse.json({
        status: 'ERROR',
        error: postsTestError.message,
        code: postsTestError.code,
        details: 'Unknown database error',
      }, { status: 500 })
    }

    return NextResponse.json({
      status: 'SUCCESS',
      message: '✅ Tables are accessible!',
      canAccessPosts: true,
      recommendation: 'Your database is properly configured',
    })
  } catch (error) {
    console.error('Diagnostic error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}
