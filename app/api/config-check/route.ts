import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔍 Checking Supabase Configuration...')

    // Check environment variables
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('Environment vars:', {
      hasUrl: !!url,
      hasAnonKey: !!anonKey,
      hasServiceKey: !!serviceKey,
    })

    if (!url || !anonKey || !serviceKey) {
      return NextResponse.json({
        status: 'CONFIG_ERROR',
        missing: {
          url: !url ? 'NEXT_PUBLIC_SUPABASE_URL' : null,
          anonKey: !anonKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : null,
          serviceKey: !serviceKey ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
        },
        message: 'Environment variables missing! Check your .env.local file',
      }, { status: 500 })
    }

    // Try to create admin client
    const supabase = createAdminClient()
    console.log('✅ Admin client created')

    // Try a simple query
    const { data, error } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({
        status: 'DATABASE_ERROR',
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: 'Database query failed',
        nextSteps: [
          '1. Verify your Supabase project is ACTIVE (not paused)',
          '2. Check that tables actually exist in Supabase console',
          '3. Go to: https://app.supabase.com → Your Project → SQL Editor',
          '4. Run: SELECT table_name FROM information_schema.tables WHERE table_schema = "public";',
          '5. If no tables appear, you need to create the database schema',
          '6. Check if there are migrations in: supabase/migrations/',
        ]
      }, { status: 400 })
    }

    return NextResponse.json({
      status: 'SUCCESS',
      message: '✅ Supabase is properly configured!',
      config: {
        url: url.substring(0, 20) + '...',
        environment: 'configured correctly',
      },
      database: {
        accessible: true,
        postsTableExists: true,
      }
    })
  } catch (error) {
    console.error('Fatal error:', error)
    return NextResponse.json({
      status: 'FATAL_ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}
