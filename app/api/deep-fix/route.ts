import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔍 Deep diagnostic check...')

    const supabase = createAdminClient()

    // Test 1: Basic query
    const { data: testData, error: testError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })

    if (!testError) {
      return NextResponse.json({
        status: 'SUCCESS',
        message: '✅ Posts table is now accessible!',
        test_result: 'Query successful'
      })
    }

    console.error('Query error:', testError)

    // Test 2: Check what might be blocking
    return NextResponse.json({
      status: 'STILL_BLOCKED',
      original_error: testError.message,
      diagnosis: 'Even with RLS disabled, access is blocked. This might be:',
      possible_causes: [
        '1. Service role key does not have permissions',
        '2. Schema/role mismatch - tables in different schema',
        '3. Policies still exist blocking access',
        '4. Connection issue to Supabase'
      ],
      next_actions: [
        'Try running these additional SQL commands:',
        '- GRANT USAGE ON SCHEMA public TO service_role;',
        '- GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;',
        '- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;',
        '',
        'Or try granting to PUBLIC role:',
        '- GRANT SELECT, INSERT, UPDATE, DELETE ON posts TO public;',
        '- GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO public;'
      ],
      sql_to_try: `
-- Try these SQL commands in Supabase SQL Editor:

-- Grant to service_role (the admin client)
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Also grant to public to be safe
GRANT USAGE ON SCHEMA public TO public;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON posts TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON post_likes TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO public;

-- Double-check RLS is actually disabled
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- If any show true for rowsecurity, disable them:
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
      `.trim()
    })
  } catch (error) {
    console.error('Diagnostic error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Critical error in database connection'
    }, { status: 500 })
  }
}
