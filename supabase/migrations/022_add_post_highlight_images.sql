-- Additional highlight media for posts
-- Allows a post to include a main image/video plus
-- separate "important moment" and "best scenes" images.

alter table posts
  add column if not exists important_moment_url text;

alter table posts
  add column if not exists best_scenes_url text;

