-- FIX: Drop and recreate room_members with correct UUID schema
-- Use this if join room returns 500 (e.g. type mismatch, table missing)
DROP TABLE IF EXISTS room_members CASCADE;

CREATE TABLE room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

GRANT ALL ON room_members TO service_role;
GRANT ALL ON room_members TO authenticated;
GRANT ALL ON room_members TO postgres;
ALTER TABLE room_members DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_room_members_room_id ON room_members(room_id);
CREATE INDEX idx_room_members_user_id ON room_members(user_id);
