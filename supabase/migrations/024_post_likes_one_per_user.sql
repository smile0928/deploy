-- One like per user per post: unique on (post_id, user_id)
-- If duplicate rows exist, keep only the earliest like per (post_id, user_id)
DELETE FROM post_likes a
USING post_likes b
WHERE a.post_id = b.post_id
  AND a.user_id = b.user_id
  AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_post_likes_post_user_unique
  ON post_likes (post_id, user_id);

