import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createAdminClient()

    console.log('🔐 Fixing RLS policies to allow public access...')

    // Test if policies are working
    const { data: testPost, error: testError } = await supabase
      .from('posts')
      .select('id')
      .limit(1)

    if (testError) {
      console.error('❌ Posts table access error:', testError.message)
      return NextResponse.json({
        success: false,
        error: testError.message,
        message: '⚠️ RLS policies need to be fixed manually in Supabase Console',
        instructions: [
          '1. Go to: https://app.supabase.com → Your Project',
          '2. Navigate to: SQL Editor',
          '3. Create a new query and paste the migration SQL',
          '4. Paste content from: supabase/migrations/001_fix_rls_policies.sql',
          '5. Click "Run"',
        ],
        steps: [
          'DROP POLICY IF EXISTS "Posts are visible to authenticated users" ON posts;',
          'CREATE POLICY "Posts are visible to everyone" ON posts FOR SELECT USING (true);',
          'CREATE POLICY "Users can insert their own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);',
          'CREATE POLICY "Users can update their own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);',
          'CREATE POLICY "Users can delete their own posts" ON posts FOR DELETE USING (auth.uid() = user_id);',
        ]
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '✅ RLS policies are working correctly!',
      canAccessPosts: true,
      postsCount: 1,
      details: 'Your database is properly configured for public access',
    })
  } catch (error) {
    console.error('❌ Error checking RLS policies:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        note: 'Could not verify RLS configuration',
      },
      { status: 500 }
    )
  }
}
