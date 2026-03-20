import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'Run this SQL in Supabase Dashboard → SQL Editor to enable cover images:',
    sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url TEXT;',
    steps: [
      '1. Open your Supabase project',
      '2. Go to SQL Editor',
      '3. Paste and run: ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url TEXT;',
    ],
  })
}
