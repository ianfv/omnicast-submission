# Omnicast Codebase Analysis

## Overview

Omnicast is an AI-powered podcast platform built with Vite, React, TypeScript, and Supabase. Users create customizable hosts, enter topics, upload documents (optional), and generate AI podcast conversations played with real TTS. The system uses ElevenLabs for text-to-speech (via direct API streaming) and the Lovable AI gateway (Gemini 3 Flash) for script generation.

---

## Entry Points

- `src/main.tsx:5` - Renders `<App />` into DOM root
- `src/App.tsx:17-38` - Application root with providers and routing

---

## Route Configuration (`src/App.tsx:24-33`)

| Path           | Component          | Purpose                                |
| -------------- | ------------------ | -------------------------------------- |
| `/`            | `StudioPage`       | Landing page with VantaBackground      |
| `/setup`       | `PodcastSetupPage` | 4-step wizard for podcast creation     |
| `/demo-studio` | `DemoStudioPage`   | Demo mode with generation and playback |
| `/auth`        | `AuthPage`         | Authentication forms                   |
| `/join`        | `JoinPage`         | Join via code (minimal)                |
| `/dashboard`   | `DashboardPage`    | User podcast history                   |
| `*`            | `NotFound`         | 404 fallback                           |

---

## Provider Hierarchy (`src/App.tsx:17-38`)

```
QueryClientProvider (TanStack Query)
└── TooltipProvider (Radix UI)
    └── AuthProvider (Custom auth context)
        └── Toaster components
            └── BrowserRouter
                └── Routes
```

---

## Database Schema (`src/integrations/supabase/types.ts:16-82`)

### Tables (Simplified)

| Table              | Key Fields                                                                                              | Lines |
| ------------------ | ------------------------------------------------------------------------------------------------------- | ----- |
| `podcast_sessions` | `id`, `user_id`, `prompt`, `hosts` (JSON), `settings` (JSON), `transcript` (JSON), `title`, `documents` | 17-55 |
| `profiles`         | `id`, `user_id`, `full_name`, `avatar_url`                                                              | 56-82 |

### RPC Functions (Legacy - lines 87-154)

Functions for classroom system are retained in types but no longer actively used:

- `generate_join_code`, `lookup_classroom_by_code`, `enroll_in_classroom`
- `get_classroom_for_enrollment`, `get_documents_for_enrollment`, `get_teaching_style_for_enrollment`

---

## Core User Flows

### 1. Landing Page (`src/pages/StudioPage.tsx`)

**Entry:** `/` route

**Key Elements (lines 1-100):**

- `VantaBackground` component (line 10) - Animated trunk visualization
- Framer Motion animations for fade-in effects
- "Start now" button → navigates to `/setup` (line 76)
- "Sign in" button → navigates to `/auth` (line 83)

### 2. Podcast Setup Wizard (`src/pages/PodcastSetupPage.tsx`)

**Entry:** `/setup` route

**Steps (lines 14-34):**

```typescript
type SetupStep = "documents" | "topic" | "customize" | "summary";
```

| Step        | Lines   | Description                                        |
| ----------- | ------- | -------------------------------------------------- |
| `documents` | 203-246 | File upload (PDF, TXT, MD, DOCX)                   |
| `topic`     | 249-262 | Text input for podcast topic                       |
| `customize` | 265-403 | Host count (1-3), avatar, voice, role, personality |
| `summary`   | 406-490 | Review and generate button                         |

**Host Customization (lines 117-157):**

- Dynamic host count adjustment via `handleHostCountChange()`
- Per-host editing with avatar picker, voice/role selects
- Personality traits: analytical, enthusiastic, skeptical, supportive

**Navigation Flow (line 96-99):**

```typescript
navigate("/demo?autostart=true");
```

Passes `autostart` URL param to trigger automatic generation.

### 3. Demo Studio / Generation (`src/pages/DemoStudioPage.tsx`)

**Entry:** `/demo-studio` or `/demo?autostart=true`

**Auto-Start Detection (lines 59-70):**

```typescript
if (autostart === "true" && !hasAutoStarted.current && prompt?.trim()) {
  generate();
}
```

**View States:**

1. **Generating View** (lines 133-207): Full-screen loading with animated progress dots
2. **Playback View** (lines 117-128): `RealTimePlaybackView` with hosts and TTS
3. **Viral Clips View** (lines 105-114): `ViralClipsView` for clip selection
4. **Studio View** (lines 210-346): Host panel, topic input, generate button

**Generation Steps Displayed (lines 134-140):**

- `ingesting` → "Analyzing your documents..."
- `extracting` → "Extracting key insights..."
- `outline` → "Building conversation outline..."
- `assigning` → "Assigning host perspectives..."
- `generating` → "Generating your podcast..."

---

## Audio Streaming System

### Direct API Client (`src/lib/audioStream.ts`)

**Purpose:** Client-side ElevenLabs TTS (bypasses edge function for lower latency)

**Voice Mapping (lines 10-19):**

```typescript
const VOICE_ID_MAP: Record<string, string> = {
  'male-deep': 'pNInz6obpgDQGcFmaJgB',    // Adam
  'male-calm': 'VR6AewLTigWG4xSOukaG',    // Arnold
  'female-warm': 'EXAVITQu4vr4xnSDxMaL',  // Bella
  'female-energetic': 'MF3mGyEYCl7XYWbV9V6O', // Elli
  'british-crisp': 'onwK4e9ZLuTAKqWW03F9', // Daniel
  ...
};
```

**Key Functions:**

| Function                 | Lines   | Description                                          |
| ------------------------ | ------- | ---------------------------------------------------- |
| `resolveVoiceId()`       | 39-45   | Maps internal ID to ElevenLabs ID                    |
| `streamAudio()`          | 54-157  | Creates `AudioStreamController` with play/pause/stop |
| `streamAudioToElement()` | 163-214 | Streams to HTMLAudioElement                          |
| `AudioStreamManager`     | 219-265 | Class wrapper for hook usage                         |

**API Call (lines 72-90):**

- Endpoint: `https://api.elevenlabs.io/v1/text-to-speech/{voiceId}/stream?optimize_streaming_latency=3`
- Model: `eleven_turbo_v2_5`
- Auth: `VITE_ELEVENLABS_API_KEY` env var

**AudioStreamManager (lines 219-265):**

```typescript
class AudioStreamManager {
  async speak(text: string, voiceId: string): Promise<void>;
  stop(): void;
  pause(): void;
  get isPlaying(): boolean;
}
```

---

## Real-Time Playback (`src/components/RealTimePlaybackView.tsx`)

**State Management (lines 255-274):**

```typescript
const [state, setState] = useState<ConversationState>("IDLE");
const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
const [currentIndex, setCurrentIndex] = useState(0);
const [activeHostIndex, setActiveHostIndex] = useState(0);
const [isPlaying, setIsPlaying] = useState(false);
```

**Lifecycle:**

1. Mount → `generatePodcast()` (line 300)
2. Parse transcript from edge function response (lines 342-386)
3. Start playback loop at segment 0 (lines 389-395)
4. `playSegment()` advances index on audio/timing complete (lines 403-483)

**Segment Playback Logic (lines 403-483):**

- Uses `AudioStreamManager.speak()` for TTS
- Falls back to timing simulation when muted (lines 441-447)
- Advances index via `setCurrentIndex(prev => prev + 1)` on completion

**Visual Components:**

- `DustParticles` (lines 50-80) - Ambient floating particles
- `StudioSpotlight` (lines 83-113) - Dynamic host lighting
- `CinematicAvatar` (lines 115-224) - 3D-transformed host avatars with speaking indicators
- `StateIndicator` (lines 226-253) - Shows IDLE/LISTENING/THINKING/SPEAKING

---

## VantaBackground (`src/components/VantaBackground.tsx`)

**Purpose:** Audio-reactive animated background on landing page

**Dependencies (lines 20-29):**

- Loads p5.js and Vanta TRUNK via CDN scripts
- Initializes Vanta effect on element (lines 31-46)

**Vanta Configuration (lines 33-46):**

```typescript
VANTA.TRUNK({
  color: 0xeb761f, // Orange
  backgroundColor: 0x0, // Black
  chaos: 9.5,
  speed: 0.5,
  scale: 10.0, // Deep zoom
});
```

**Audio Reactivity (lines 68-150):**

1. Request microphone access (line 49, 68-89)
2. Create AnalyserNode with FFT (lines 73-81)
3. Animation loop reads frequency data (lines 104-130)
4. Maps bass/mid/treble to chaos/spacing/scale parameters

**Audio Mapping (lines 122-124):**

```typescript
targetChaos = 10.0 + normalizedVolume * 20.0; // Overall volume
targetSpacing = 1.0 + bass * 8.0; // Bass frequencies
targetScale = 9.0 + mid * 3.0; // Mid frequencies
```

---

## State Management (`src/hooks/usePodcastStore.ts`)

**Storage Key:** `omnicast-state` (localStorage)

**Stored State (lines 14-19):**

```typescript
interface StoredState {
  hosts: HostConfig[];
  settings: PodcastSettings;
  ragFiles: RagFile[];
  lastPodcast: GeneratedPodcast | null;
}
```

**Lazy Initialization (lines 96-111):**

- `hosts`, `settings`, `ragFiles`, `prompt` load from localStorage on first render
- Falls back to `DEFAULT_HOSTS` if empty

**Key Functions:**

| Function         | Lines   | Description                                   |
| ---------------- | ------- | --------------------------------------------- |
| `replaceHosts()` | 137-139 | Replaces entire hosts array                   |
| `updateHost()`   | 141-149 | Updates single host by ID                     |
| `addRagFile()`   | 155-169 | Creates RagFile from File object              |
| `generate()`     | 175-228 | Orchestrates generation with step progression |

**Generation Flow (lines 175-228):**

1. Check for documents → ingesting (2s) → extracting (1.5s) → assigning (1.5s)
2. outline (1.5s) → generating (2s) → call `generatePodcast()`
3. finalizing (1s) → complete → enter playback mode

---

## Edge Function: generate-podcast

**Location:** `supabase/functions/generate-podcast/index.ts`

**Status (lines 3-9):** Marked deprecated but still functional

**Request Body Support (lines 58-66):**

```typescript
const prompt = body.prompt || body.topic || 'General Discussion';
const hosts = body.hosts || [];
const settings = body.settings || { length: 'medium', tone: 'casual', ... };
const ragChunks = body.ragChunks || [];
const ragContextFromClient = body.ragContext || '';
```

**LLM Request (lines 116-130):**

- Endpoint: `https://ai.gateway.lovable.dev/v1/chat/completions`
- Model: `google/gemini-3-flash-preview`
- Response format: `json_object`

**Response Parsing (lines 160-188):**

- Attempts JSON.parse on content
- Falls back to regex extraction of JSON array
- Handles array, `transcript`, `turns`, or `dialogue` properties

**Title Generation (lines 190-213):**

- Separate LLM call for catchy episode title
- Max 60 characters

---

## Type Definitions (`src/types/podcast.ts`)

### Core Types

| Type                | Lines | Key Fields                                                                          |
| ------------------- | ----- | ----------------------------------------------------------------------------------- | ------------ | ---------- | ----------- |
| `HostConfig`        | 1-11  | `id`, `name`, `voiceId`, `elevenlabs_voice_id`, `role`, `personality`, `expression` |
| `ConversationState` | 14    | `'IDLE'                                                                             | 'LISTENING'  | 'THINKING' | 'SPEAKING'` |
| `ConnectionState`   | 67    | `'idle'                                                                             | 'connecting' | 'ready'    | 'error'`    |
| `PodcastSettings`   | 23-29 | `length`, `tone`, `includeExamples`, `askQuestions`, `useRag`                       |
| `TranscriptTurn`    | 47-53 | `speakerId`, `speakerName`, `text`, `timestamp`                                     |
| `GeneratedPodcast`  | 55-62 | `id`, `title`, `prompt`, `transcript`, `ragChunks`, `createdAt`                     |
| `GenerationStep`    | 64    | Union of step names                                                                 |

### Avatar Presets (lines 139-168)

Organized by category:

- `professional`: notionists style, dark backgrounds
- `casual`: lorelei style
- `expressive`: personas style with colored backgrounds

### Personality Traits (lines 171-176)

Reduced to 4 options: analytical, enthusiastic, skeptical, supportive

---

## Authentication (`src/hooks/useAuth.ts`)

**Supabase Auth Integration (lines 1-102):**

| Function         | Lines | Description                       |
| ---------------- | ----- | --------------------------------- |
| `fetchProfile()` | 12-22 | Queries profiles table by user_id |
| `signUp()`       | 56-69 | Creates user with metadata        |
| `signIn()`       | 71-77 | Password authentication           |
| `signOut()`      | 79-87 | Clears session                    |

**Auth Context (`src/contexts/AuthContext.tsx`):**

- Wraps app at lines 20-27 of App.tsx
- Provides `useAuthContext()` hook (lines 30-36)

---

## Studio UI Components (`src/components/studio/`)

| Component              | File                     | Purpose                             |
| ---------------------- | ------------------------ | ----------------------------------- |
| `StudioHostPanel`      | StudioHostPanel.tsx      | Horizontal host card row            |
| `StudioHostCard`       | StudioHostCard.tsx       | Individual host display/edit        |
| `HostEditorSheet`      | HostEditorSheet.tsx      | Sheet modal for host editing        |
| `StudioTopicInput`     | StudioTopicInput.tsx     | Topic textarea with document upload |
| `StudioDocumentUpload` | StudioDocumentUpload.tsx | File upload zone                    |
| `StudioGenerateButton` | StudioGenerateButton.tsx | Generate action button              |
| `PodcastSidebar`       | PodcastSidebar.tsx       | Session history sidebar             |

---

## Key Data Flows

### Podcast Creation Flow

```
StudioPage (/) → "Start now"
    ↓
PodcastSetupPage (/setup) → 4-step wizard
    ↓
"Generate" → navigate('/demo?autostart=true')
    ↓
DemoStudioPage detects autostart param
    ↓
usePodcastStore.generate()
    ↓
Generation steps (ingesting → generating)
    ↓
supabase.functions.invoke('generate-podcast')
    ↓
Edge function → Lovable AI Gateway (Gemini)
    ↓
Parse transcript → setCurrentPodcast()
    ↓
RealTimePlaybackView renders
    ↓
AudioStreamManager.speak() for each segment
```

### Audio Playback Flow

```
RealTimePlaybackView mount
    ↓
generatePodcast() → parse transcript
    ↓
setIsPlaying(true), setCurrentIndex(0)
    ↓
useEffect triggers playSegment(currentIndex)
    ↓
AudioStreamManager.speak(text, voiceId)
    ↓
ElevenLabs API → audio buffer
    ↓
AudioContext.decodeAudioData → play
    ↓
onEnded → advance currentIndex
    ↓
Loop until transcript complete
```

---

## Environment Variables

| Variable                        | Purpose                              |
| ------------------------------- | ------------------------------------ |
| `VITE_SUPABASE_URL`             | Supabase project URL                 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key                    |
| `VITE_ELEVENLABS_API_KEY`       | ElevenLabs API key (client-side)     |
| `LOVABLE_API_KEY`               | LLM gateway key (edge function only) |

---

## Edge Functions Summary

| Function               | Location                                           | Purpose                                                 |
| ---------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| `generate-podcast`     | `supabase/functions/generate-podcast/index.ts`     | LLM script generation (deprecated but functional)       |
| `elevenlabs-tts`       | `supabase/functions/elevenlabs-tts/index.ts`       | Server-side TTS (not used in favor of client streaming) |
| `generate-scene-image` | `supabase/functions/generate-scene-image/index.ts` | Image generation (not analyzed)                         |
