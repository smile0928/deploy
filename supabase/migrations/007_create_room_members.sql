-- Create room_members table if it doesn't exist
-- room_id must match rooms.id type (UUID in Supabase)
-- If room_members exists with room_id BIGINT (wrong schema), run first:
--   DROP TABLE IF EXISTS room_members CASCADE;
CREATE TABLE IF NOT EXISTS room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Ensure permissions (service_role = API, authenticated = users)
GRANT ALL ON room_members TO service_role;
GRANT ALL ON room_members TO authenticated;
GRANT ALL ON room_members TO postgres;
ALTER TABLE room_members DISABLE ROW LEVEL SECURITY;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id);
