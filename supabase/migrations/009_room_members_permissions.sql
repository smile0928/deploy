-- Fix: permission denied for table room_members
-- Grant full access to service_role (used by API) and authenticated
GRANT ALL ON room_members TO service_role;
GRANT ALL ON room_members TO authenticated;
GRANT ALL ON room_members TO postgres;
