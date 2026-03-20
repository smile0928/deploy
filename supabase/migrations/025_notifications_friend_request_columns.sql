-- Ensure notifications table has columns used by the app (follow, like, friend_request)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
