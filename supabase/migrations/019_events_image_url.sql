-- Allow events to have an optional cover/banner image
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;
