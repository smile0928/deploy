-- Add a simple type column to posts so we can
-- distinguish regular feed posts from uploaded anime/video/etc.
-- This is safe to run multiple times thanks to IF NOT EXISTS.

alter table posts
  add column if not exists type TEXT;
