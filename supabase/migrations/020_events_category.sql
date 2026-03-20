-- Optional category for event cards (e.g. "Watch Party") – shown in the left badge
ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT;
