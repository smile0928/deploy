-- One comment per user per post: unique on (post_id, user_id)
-- If duplicate rows exist, keep only the earliest comment per (post_id, user_id)
DELETE FROM comments a
USING comments b
WHERE a.post_id = b.post_id
  AND a.user_id = b.user_id
  AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_post_user_unique
  ON comments (post_id, user_id);

