import { HostConfig, PodcastSettings, TranscriptTurn } from './podcast';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PodcastSession {
  id: string;
  user_id: string;
  title: string | null;
  prompt: string;
  hosts: HostConfig[];
  settings: Partial<PodcastSettings>;
  documents: PodcastDocument[];
  transcript: TranscriptTurn[];
  created_at: string;
  updated_at: string;
}

// Document stored within a podcast session
export interface PodcastDocument {
  id: string;
  name: string;
  content: string;
}
