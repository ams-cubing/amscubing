-- user.role is a text column; the Drizzle enum now allows 'editor' in-app.
-- No Postgres DDL required. This migration syncs the drizzle meta snapshot
-- after 0018 (custom notification enum values without a kit snapshot).
SELECT 1;
