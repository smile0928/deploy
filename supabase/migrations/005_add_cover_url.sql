-- Add cover_url column to users table for profile cover/banner image
ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url TEXT;
