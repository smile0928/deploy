-- FIX RLS Policies AND Table Permissions for posts and related tables

-- CRITICAL: Grant table-level permissions to authenticated users
GRANT SELECT ON posts TO authenticated;
GRANT SELECT ON comments TO authenticated;
GRANT SELECT ON post_likes TO authenticated;
GRANT SELECT ON users TO authenticated;
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON followers TO authenticated;
GRANT SELECT ON events TO authenticated;
GRANT SELECT ON event_attendees TO authenticated;
GRANT SELECT ON rooms TO authenticated;
GRANT SELECT ON room_members TO authenticated;
GRANT SELECT ON messages TO authenticated;

-- Grant write permissions
GRANT INSERT ON posts TO authenticated;
GRANT INSERT ON comments TO authenticated;
GRANT INSERT ON post_likes TO authenticated;
GRANT INSERT ON messages TO authenticated;
GRANT INSERT ON events TO authenticated;

GRANT UPDATE ON posts TO authenticated;
GRANT UPDATE ON comments TO authenticated;
GRANT UPDATE ON messages TO authenticated;

GRANT DELETE ON posts TO authenticated;
GRANT DELETE ON comments TO authenticated;
GRANT DELETE ON post_likes TO authenticated;
GRANT DELETE ON messages TO authenticated;

-- Posts: Allow public read
DROP POLICY IF EXISTS "Posts are visible to authenticated users" ON posts;
DROP POLICY IF EXISTS "Posts are visible to everyone" ON posts;
CREATE POLICY "Posts are visible to everyone" ON posts FOR SELECT USING (true);

-- Allow authenticated users to insert posts
DROP POLICY IF EXISTS "Users can insert their own posts" ON posts;
CREATE POLICY "Users can insert their own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own posts
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
CREATE POLICY "Users can update their own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own posts
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
CREATE POLICY "Users can delete their own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Comments: Allow public read
DROP POLICY IF EXISTS "Comments are visible to authenticated users" ON comments;
DROP POLICY IF EXISTS "Comments visible to everyone" ON comments;
CREATE POLICY "Comments visible to everyone" ON comments FOR SELECT USING (true);

-- Allow authenticated users to insert comments
DROP POLICY IF EXISTS "Users can insert comments" ON comments;
CREATE POLICY "Users can insert comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Post Likes: Allow public read
DROP POLICY IF EXISTS "Post likes visible to authenticated users" ON post_likes;
DROP POLICY IF EXISTS "Post likes visible to everyone" ON post_likes;
CREATE POLICY "Post likes visible to everyone" ON post_likes FOR SELECT USING (true);

-- Allow authenticated users to insert likes
DROP POLICY IF EXISTS "Users can insert likes" ON post_likes;
CREATE POLICY "Users can insert likes" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own likes
DROP POLICY IF EXISTS "Users can delete their own likes" ON post_likes;
CREATE POLICY "Users can delete their own likes" ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- Events: Allow public read
DROP POLICY IF EXISTS "Events visible to authenticated users" ON events;
DROP POLICY IF EXISTS "Events visible to everyone" ON events;
CREATE POLICY "Events visible to everyone" ON events FOR SELECT USING (true);

-- Rooms: Allow public rooms to be visible
DROP POLICY IF EXISTS "Rooms are visible to authenticated users" ON rooms;
DROP POLICY IF EXISTS "Public rooms are visible to everyone" ON rooms;
CREATE POLICY "Public rooms are visible to everyone" ON rooms FOR SELECT USING (is_public = true OR auth.role() = 'authenticated');

-- Users: Allow public read
DROP POLICY IF EXISTS "Users are visible to authenticated users" ON users;
DROP POLICY IF EXISTS "Users visible to everyone" ON users;
CREATE POLICY "Users visible to everyone" ON users FOR SELECT USING (true);

-- Profiles: Allow public read
DROP POLICY IF EXISTS "Profiles visible to authenticated users" ON profiles;
DROP POLICY IF EXISTS "Profiles visible to everyone" ON profiles;
CREATE POLICY "Profiles visible to everyone" ON profiles FOR SELECT USING (true);

-- Followers: Allow public read
DROP POLICY IF EXISTS "Followers are visible to authenticated users" ON followers;
DROP POLICY IF EXISTS "Followers visible to everyone" ON followers;
CREATE POLICY "Followers visible to everyone" ON followers FOR SELECT USING (true);

-- Room members: Allow public read
DROP POLICY IF EXISTS "Room members visible to authenticated users" ON room_members;
DROP POLICY IF EXISTS "Room members visible to everyone" ON room_members;
CREATE POLICY "Room members visible to everyone" ON room_members FOR SELECT USING (true);

-- Event attendees: Allow public read
DROP POLICY IF EXISTS "Event attendees visible to authenticated users" ON event_attendees;
DROP POLICY IF EXISTS "Event attendees visible to everyone" ON event_attendees;
CREATE POLICY "Event attendees visible to everyone" ON event_attendees FOR SELECT USING (true);
