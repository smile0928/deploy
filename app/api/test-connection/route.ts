import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('Testing Supabase connection...')
    const adminClient = createAdminClient()

    // Try a simple query
    const { data, error, status } = await adminClient
      .from('posts')
      .select('count')
      .limit(1)

    console.log('Supabase response:', { status, error: error?.message, data })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          status: status,
          details: error.details || 'No additional details'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data
    })
  } catch (error) {
    console.error('Connection test failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Connection failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
