-- event_interested: users who are "interested" in an event (not necessarily attending)
CREATE TABLE IF NOT EXISTS event_interested (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_interested_event_id ON event_interested(event_id);
CREATE INDEX IF NOT EXISTS idx_event_interested_user_id ON event_interested(user_id);

-- Allow authenticated users (RLS still applies for INSERT/DELETE)
GRANT SELECT ON event_interested TO authenticated;
GRANT INSERT ON event_interested TO authenticated;
GRANT DELETE ON event_interested TO authenticated;

-- Allow service_role and all roles (backend may connect as different role) for GET /api/events
GRANT SELECT ON event_interested TO service_role;
GRANT SELECT ON event_interested TO public;

ALTER TABLE event_interested ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_interested visible to everyone" ON event_interested;
CREATE POLICY "event_interested visible to everyone" ON event_interested FOR SELECT USING (true);

DROP POLICY IF EXISTS "users can insert own event_interested" ON event_interested;
CREATE POLICY "users can insert own event_interested" ON event_interested FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users can delete own event_interested" ON event_interested;
CREATE POLICY "users can delete own event_interested" ON event_interested FOR DELETE USING (auth.uid() = user_id);
