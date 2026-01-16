-- Link users' sessions to Backboard memory (per-session thread)
ALTER TABLE podcast_sessions 
ADD COLUMN IF NOT EXISTS backboard_thread_id TEXT;

-- Link podcast definitions to Backboard Assistants (per-podcast assistant)
ALTER TABLE podcast_sessions 
ADD COLUMN IF NOT EXISTS backboard_assistant_id TEXT;