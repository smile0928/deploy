-- Add interested_count to events so it can be updated when users toggle interest
ALTER TABLE events ADD COLUMN IF NOT EXISTS interested_count INTEGER NOT NULL DEFAULT 0;

-- Backfill from event_interested so existing data is correct
UPDATE events e
SET interested_count = COALESCE(
  (SELECT COUNT(*)::INTEGER FROM event_interested ei WHERE ei.event_id = e.id),
  0
);
