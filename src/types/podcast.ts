export interface HostConfig {
  id: string;
  name: string;
  voiceId: string;
  elevenlabs_voice_id?: string; // Direct ElevenLabs voice ID for streaming
  voiceLabel: string;
  role: string;
  avatarUrl?: string;
  personality?: string;
  expression?: 'neutral' | 'excited' | 'thoughtful' | 'skeptical' | 'amused';
}

// State machine for real-time conversational playback
export type ConversationState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';


export interface ProducerSettings {
  toneValue: number; // 0-100 (calm to intense)
  debateIntensity: boolean;
  isProducerMode: boolean;
}

export interface PodcastSettings {
  length: 'short' | 'medium' | 'long';
  tone: 'casual' | 'technical' | 'hardcore' | 'interview';
  includeExamples: boolean;
  askQuestions: boolean;
  useRag: boolean;
}

export interface RagFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: Date;
  rawTextMock: string;
}

export interface RagChunk {
  id: string;
  fileId: string;
  fileName: string;
  text: string;
  relevanceScore: number;
}

export interface TranscriptTurn {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  timestamp: number;
}

export interface GeneratedPodcast {
  id: string;
  title: string;
  prompt: string;
  transcript: TranscriptTurn[];
  ragChunks: RagChunk[];
  createdAt: Date;
}

export type GenerationStep = 'idle' | 'ingesting' | 'extracting' | 'assigning' | 'outline' | 'generating' | 'finalizing' | 'complete';

// Connection state for real-time sessions (replaces GenerationStep for live podcasts)
export type ConnectionState = 'idle' | 'connecting' | 'ready' | 'error';


export type ClipCategory = 'funny' | 'insight' | 'controversial' | 'exam-tip';

export interface ViralClip {
  id: string;
  startIndex: number;
  endIndex: number;
  category: ClipCategory;
  label: string;
  transcript: TranscriptTurn[];
  duration: number; // seconds
}

export const VOICE_OPTIONS = [
  { id: 'male-deep', label: 'Male - Deep', gender: 'male' },
  { id: 'male-calm', label: 'Male - Calm', gender: 'male' },
  { id: 'male-energetic', label: 'Male - Energetic', gender: 'male' },
  { id: 'female-warm', label: 'Female - Warm', gender: 'female' },
  { id: 'female-energetic', label: 'Female - Energetic', gender: 'female' },
  { id: 'female-professional', label: 'Female - Professional', gender: 'female' },
  { id: 'british-crisp', label: 'British - Crisp', gender: 'neutral' },
  { id: 'british-warm', label: 'British - Warm', gender: 'neutral' },
] as const;

export const ROLE_OPTIONS = [
  { value: 'Backend Developer', label: 'Backend Developer' },
  { value: 'Frontend Developer', label: 'Frontend Developer' },
  { value: 'Full Stack Developer', label: 'Full Stack Developer' },
  { value: 'DevOps Engineer', label: 'DevOps Engineer' },
  { value: 'Data Scientist', label: 'Data Scientist' },
  { value: 'ML Engineer', label: 'ML Engineer' },
  { value: 'Product Manager', label: 'Product Manager' },
  { value: 'UX Designer', label: 'UX Designer' },
  { value: 'Tech Lead', label: 'Tech Lead' },
  { value: 'Junior Developer', label: 'Junior Developer' },
  { value: 'Senior Engineer', label: 'Senior Engineer' },
  { value: 'Professor', label: 'Professor' },
  { value: 'Student', label: 'Student' },
  { value: 'Curious Learner', label: 'Curious Learner' },
  { value: 'Industry Expert', label: 'Industry Expert' },
  { value: 'Moderator', label: 'Moderator' },
  { value: 'Devil\'s Advocate', label: 'Devil\'s Advocate' },
] as const;

export const PERSONALITY_OPTIONS = [
  { value: 'analytical', label: 'Analytical', emoji: '🧠' },
  { value: 'enthusiastic', label: 'Enthusiastic', emoji: '🎉' },
  { value: 'skeptical', label: 'Skeptical', emoji: '🤔' },
  { value: 'supportive', label: 'Supportive', emoji: '💪' },
  { value: 'humorous', label: 'Humorous', emoji: '😄' },
  { value: 'serious', label: 'Serious', emoji: '🎯' },
] as const;

export const LENGTH_OPTIONS = [
  { value: 'short', label: 'Short (2 min)', turns: 10 },
  { value: 'medium', label: 'Medium (5 min)', turns: 20 },
  { value: 'long', label: 'Long (10 min)', turns: 30 },
] as const;

export const TONE_OPTIONS = [
  { value: 'casual', label: 'Casual' },
  { value: 'technical', label: 'Technical' },
  { value: 'hardcore', label: 'Hardcore' },
  { value: 'interview', label: 'Interview Prep' },
] as const;

// Avatar style categories
export type AvatarCategory = 'professional' | 'casual' | 'expressive';

// Categorized avatar presets for different host styles
export const AVATAR_PRESETS_BY_CATEGORY: Record<AvatarCategory, { id: string; url: string; name: string }[]> = {
  professional: [
    { id: 'pro-1', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Marcus&backgroundColor=1a1a2e', name: 'Marcus' },
    { id: 'pro-2', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Elena&backgroundColor=16213e', name: 'Elena' },
    { id: 'pro-3', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=David&backgroundColor=0f3460', name: 'David' },
    { id: 'pro-4', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Sofia&backgroundColor=1a1a2e', name: 'Sofia' },
    { id: 'pro-5', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=James&backgroundColor=16213e', name: 'James' },
  ],
  casual: [
    { id: 'cas-1', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Alex&backgroundColor=2d3436', name: 'Alex' },
    { id: 'cas-2', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Sam&backgroundColor=2d3436', name: 'Sam' },
    { id: 'cas-3', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Jordan&backgroundColor=2d3436', name: 'Jordan' },
    { id: 'cas-4', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Morgan&backgroundColor=2d3436', name: 'Morgan' },
    { id: 'cas-5', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Riley&backgroundColor=2d3436', name: 'Riley' },
  ],
  expressive: [
    { id: 'exp-1', url: 'https://api.dicebear.com/7.x/personas/svg?seed=Phoenix&backgroundColor=c0aede', name: 'Phoenix' },
    { id: 'exp-2', url: 'https://api.dicebear.com/7.x/personas/svg?seed=River&backgroundColor=b6e3f4', name: 'River' },
    { id: 'exp-3', url: 'https://api.dicebear.com/7.x/personas/svg?seed=Storm&backgroundColor=ffd5dc', name: 'Storm' },
    { id: 'exp-4', url: 'https://api.dicebear.com/7.x/personas/svg?seed=Sage&backgroundColor=d1d4f9', name: 'Sage' },
    { id: 'exp-5', url: 'https://api.dicebear.com/7.x/personas/svg?seed=Quinn&backgroundColor=c1f4d5', name: 'Quinn' },
  ],
};

// Legacy flat array for backward compatibility
export const AVATAR_PRESETS = [
  ...AVATAR_PRESETS_BY_CATEGORY.professional.slice(0, 2),
  ...AVATAR_PRESETS_BY_CATEGORY.casual.slice(0, 2),
  ...AVATAR_PRESETS_BY_CATEGORY.expressive.slice(0, 2),
] as const;

// Reduced personality options for cleaner selection
export const PERSONALITY_TRAITS = [
  { value: 'analytical', label: 'Analytical', description: 'Thoughtful, data-driven approach' },
  { value: 'enthusiastic', label: 'Enthusiastic', description: 'Energetic, engaging presence' },
  { value: 'skeptical', label: 'Skeptical', description: 'Critical, questioning perspective' },
  { value: 'supportive', label: 'Supportive', description: 'Encouraging, collaborative style' },
] as const;
