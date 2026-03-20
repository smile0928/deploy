-- event_comments: comments on events
CREATE TABLE IF NOT EXISTS event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_comments_event_id ON event_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_user_id ON event_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_created_at ON event_comments(created_at DESC);

GRANT SELECT ON event_comments TO authenticated;
GRANT INSERT ON event_comments TO authenticated;
GRANT SELECT ON event_comments TO service_role;
GRANT INSERT ON event_comments TO service_role;

ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_comments visible to everyone" ON event_comments;
CREATE POLICY "event_comments visible to everyone" ON event_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "users can insert own event_comments" ON event_comments;
CREATE POLICY "users can insert own event_comments" ON event_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Optional: allow events to cache comment count for display
ALTER TABLE events ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0;
