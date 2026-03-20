-- Add ALL missing columns to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Verify all required columns exist
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'rooms' ORDER BY column_name;
