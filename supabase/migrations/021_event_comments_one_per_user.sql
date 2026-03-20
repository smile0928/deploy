-- One comment per user per event: unique on (event_id, user_id)
-- If duplicate rows exist, keep only the earliest comment per (event_id, user_id)
DELETE FROM event_comments a
USING event_comments b
WHERE a.event_id = b.event_id
  AND a.user_id = b.user_id
  AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_comments_event_user_unique
  ON event_comments (event_id, user_id);
