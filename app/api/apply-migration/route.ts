import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

const MIGRATION_SQL = `
-- 1. USERS TABLE (if not exists)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. FOLLOWERS TABLE
DROP TABLE IF EXISTS followers CASCADE;
CREATE TABLE followers (
  id BIGSERIAL PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- 3. ADD MISSING COLUMNS TO MESSAGES TABLE
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS room_id BIGINT;

-- 4. ADD MISSING COLUMNS TO ROOMS TABLE
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0;

-- 5. NOTIFICATIONS TABLE
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 6. GRANT PERMISSIONS
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON followers TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON room_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO public;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 7. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers(following_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 8. ADD COVER_URL TO USERS
ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- 9. CREATE room_members IF NOT EXISTS (room_id UUID to match rooms.id)
CREATE TABLE IF NOT EXISTS room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id);

-- 10. DISABLE RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE followers DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
`;

export async function POST(request: Request) {
  try {
    const adminClient = createAdminClient();
    
    console.log('Starting complete schema migration...');
    
    // Execute the migration
    const { data, error } = await adminClient.rpc('exec_sql', { sql: MIGRATION_SQL });
    
    if (error) {
      console.error('Migration RPC error:', error);
      // Try manual approach - split and execute
      return NextResponse.json(
        { 
          success: false,
          message: 'Could not use RPC. Use SQL Editor directly.',
          instructions: 'Go to Supabase SQL Editor and run the migration file: supabase/migrations/004_complete_schema_fix.sql',
          error: error.message 
        },
        { status: 400 }
      );
    }

    console.log('Migration completed successfully');
    return NextResponse.json({
      success: true,
      message: 'Complete schema migration applied successfully',
      details: {
        tables_created: ['users', 'followers'],
        tables_updated: ['messages', 'rooms', 'notifications'],
        permissions_granted: ['public', 'authenticated'],
        rls_disabled: 'All tables'
      }
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Run this in Supabase SQL Editor instead'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const adminClient = createAdminClient();
    
    // Check table status
    let results: any = {};
    
    // Check users table
    const { data: usersData, error: usersError } = await adminClient
      .from('users')
      .select('*')
      .limit(1);
    results.users_table = { exists: !usersError?.message?.includes('does not exist'), error: usersError?.message };
    
    // Check followers table
    const { data: followersData, error: followersError } = await adminClient
      .from('followers')
      .select('*')
      .limit(1);
    results.followers_table = { exists: !followersError?.message?.includes('does not exist'), error: followersError?.message };
    
    // Check messages table columns
    const { data: messagesData, error: messagesError } = await adminClient
      .from('messages')
      .select('sender_id, recipient_id, content')
      .limit(1);
    results.messages_table = { existing_columns: !messagesError?.message?.includes('does not exist'), error: messagesError?.message };
    
    return NextResponse.json({
      status: results,
      next_step: 'POST to /api/apply-migration'
    });
    
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
