-- Fix: grant service_role full access to event_interested so the API route
-- /api/events/[id]/interested can check/insert/delete using the admin client.
GRANT SELECT, INSERT, DELETE ON event_interested TO service_role;
