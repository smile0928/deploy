-- Enable Realtime for friend_requests and followers so friend pages update when:
-- - A friend request is sent (recipient's Recommended/Suggestions and Requests update)
-- - A friend request is accepted (both users' All Friends and Suggestions update)
-- - A friend is removed (both users' All Friends update)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'friend_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'followers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE followers;
  END IF;
END $$;
