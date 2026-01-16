-- Migration: Add columns for real-time conversational platform
-- Links podcasts to Backboard.io Assistants and Threads, and adds ElevenLabs voice IDs

-- Add backboard_assistant_id to classrooms (links podcast definition to Backboard Assistant)
ALTER TABLE public.classrooms 
ADD COLUMN IF NOT EXISTS backboard_assistant_id TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.classrooms.backboard_assistant_id IS 'Backboard.io Assistant ID for real-time podcast conversations';

-- Add backboard_thread_id to podcast_sessions (links user session to Backboard Thread)
ALTER TABLE public.podcast_sessions 
ADD COLUMN IF NOT EXISTS backboard_thread_id TEXT;

COMMENT ON COLUMN public.podcast_sessions.backboard_thread_id IS 'Backboard.io Thread ID for this specific session';

-- Add index for faster lookups by thread_id
CREATE INDEX IF NOT EXISTS idx_podcast_sessions_backboard_thread_id 
ON public.podcast_sessions(backboard_thread_id) 
WHERE backboard_thread_id IS NOT NULL;