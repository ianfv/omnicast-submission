/**
 * Audio Streaming Service
 * Handles real-time TTS using ElevenLabs streaming API
 */

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// Voice ID mapping from internal IDs to ElevenLabs voice IDs
const VOICE_ID_MAP: Record<string, string> = {
  'male-deep': 'pNInz6obpgDQGcFmaJgB', // Adam
  'male-calm': 'VR6AewLTigWG4xSOukaG', // Arnold
  'male-energetic': 'ErXwobaYiN019PkySvjV', // Antoni
  'female-warm': 'EXAVITQu4vr4xnSDxMaL', // Bella
  'female-energetic': 'MF3mGyEYCl7XYWbV9V6O', // Elli
  'female-professional': 'jBpfuIE2acCO8z3wKNLl', // Gigi
  'british-crisp': 'onwK4e9ZLuTAKqWW03F9', // Daniel
  'british-warm': 'g5CIjZEefAph4nQFvHAz', // Ethan
};

export interface AudioStreamOptions {
  voiceId: string;
  text: string;
  onChunk?: (chunk: Uint8Array) => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export interface AudioStreamController {
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  isPlaying: boolean;
}

/**
 * Resolves internal voice ID to ElevenLabs voice ID
 */
function resolveVoiceId(voiceId: string): string {
  // If it's a direct ElevenLabs ID (longer format), use as-is
  if (voiceId.length > 20) {
    return voiceId;
  }
  return VOICE_ID_MAP[voiceId] || VOICE_ID_MAP['male-calm'];
}

/**
 * Creates a streaming audio player from ElevenLabs TTS
 * @param text - Text to synthesize
 * @param voiceId - Voice ID (internal or ElevenLabs)
 * @param onEnd - Callback when audio finishes playing
 * @returns Controller object with play/pause/stop methods
 */
export function streamAudio(text: string, voiceId: string, onEnd?: () => void): AudioStreamController {
  let audioContext: AudioContext | null = null;
  let sourceNode: AudioBufferSourceNode | null = null;
  let isPlaying = false;
  let abortController: AbortController | null = null;

  const controller: AudioStreamController = {
    isPlaying: false,

    play(): Promise<void> {
      if (!ELEVENLABS_API_KEY) {
        return Promise.reject(new Error('VITE_ELEVENLABS_API_KEY is not configured'));
      }

      return new Promise<void>(async (resolve, reject) => {
        const elevenLabsVoiceId = resolveVoiceId(voiceId);
        abortController = new AbortController();

        try {
          const response = await fetch(
            `${ELEVENLABS_BASE_URL}/text-to-speech/${elevenLabsVoiceId}/stream?optimize_streaming_latency=3`,
            {
              method: 'POST',
              headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text,
                model_id: 'eleven_turbo_v2_5',
                voice_settings: {
                  stability: 0.5,
                  similarity_boost: 0.75,
                },
              }),
              signal: abortController.signal,
            }
          );

          if (!response.ok) {
            throw new Error(`ElevenLabs API error: ${response.status}`);
          }

          const arrayBuffer = await response.arrayBuffer();

          audioContext = new AudioContext();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          sourceNode = audioContext.createBufferSource();
          sourceNode.buffer = audioBuffer;
          sourceNode.connect(audioContext.destination);

          sourceNode.onended = () => {
            isPlaying = false;
            controller.isPlaying = false;
            // Call the onEnd callback when audio finishes
            onEnd?.();
            resolve(); // Now we resolve the promise!
          };

          sourceNode.start();
          isPlaying = true;
          controller.isPlaying = true;
        } catch (error) {
          if ((error as Error).name === 'AbortError') {
            resolve(); // Treated as success (stop requested)
            return;
          }
          reject(error);
        }
      });
    },

    pause() {
      if (audioContext && isPlaying) {
        audioContext.suspend();
        isPlaying = false;
        controller.isPlaying = false;
      }
    },

    stop() {
      // Abort any pending fetch
      abortController?.abort();

      // Stop audio immediately
      if (sourceNode) {
        try {
          sourceNode.stop();
        } catch {
          // Already stopped
        }
        sourceNode = null;
      }

      if (audioContext) {
        audioContext.close();
        audioContext = null;
      }

      isPlaying = false;
      controller.isPlaying = false;
    },
  };

  return controller;
}

/**
 * Creates a MediaSource-based streaming player for low-latency playback
 * This is more suitable for true streaming but requires browser support
 */
export async function streamAudioToElement(
  text: string,
  voiceId: string,
  audioElement: HTMLAudioElement
): Promise<{ stop: () => void }> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('VITE_ELEVENLABS_API_KEY is not configured');
  }

  const elevenLabsVoiceId = resolveVoiceId(voiceId);
  const abortController = new AbortController();

  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/text-to-speech/${elevenLabsVoiceId}/stream?optimize_streaming_latency=3`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
      signal: abortController.signal,
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs streaming error: ${response.status}`);
  }

  // For streaming, we use blob URL
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  audioElement.src = url;
  await audioElement.play();

  return {
    stop: () => {
      abortController.abort();
      audioElement.pause();
      audioElement.src = '';
      URL.revokeObjectURL(url);
    },
  };
}

/**
 * Hook-friendly streaming audio manager
 */
export class AudioStreamManager {
  private currentController: AudioStreamController | null = null;
  private onStateChange: ((isPlaying: boolean) => void) | null = null;

  constructor(onStateChange?: (isPlaying: boolean) => void) {
    this.onStateChange = onStateChange || null;
  }

  async speak(text: string, voiceId: string): Promise<void> {
    // Stop any current playback
    this.stop();

    // Create a promise that resolves when audio finishes
    return new Promise<void>((resolve, reject) => {
      // Create controller with onEnd callback
      this.currentController = streamAudio(text, voiceId, () => {
        // Audio finished playing
        this.onStateChange?.(false);
        resolve(); // Resolve the promise when audio ends
      });

      this.currentController.play()
        .then(() => {
          this.onStateChange?.(true);
        })
        .catch((err) => {
          this.onStateChange?.(false);
          reject(err);
        });
    });
  }

  stop(): void {
    this.currentController?.stop();
    this.currentController = null;
    this.onStateChange?.(false);
  }

  pause(): void {
    this.currentController?.pause();
    this.onStateChange?.(false);
  }

  get isPlaying(): boolean {
    return this.currentController?.isPlaying || false;
  }
}
