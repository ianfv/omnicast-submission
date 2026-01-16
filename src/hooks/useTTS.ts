import { useState, useCallback, useRef } from 'react';

interface TTSCache {
  [key: string]: string; // text hash -> audio data URL
}

interface TTSState {
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
  preloadProgress: number;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Max concurrent requests to avoid 429 errors
const MAX_CONCURRENT_REQUESTS = 2;
// Delay between requests in ms
const REQUEST_DELAY = 500;

// Simple hash for caching
function hashText(text: string, voiceId: string): string {
  return btoa(encodeURIComponent(`${voiceId}:${text.slice(0, 100)}`)).slice(0, 32);
}

export function useTTS() {
  const [state, setState] = useState<TTSState>({
    isLoading: false,
    isPlaying: false,
    error: null,
    preloadProgress: 0,
  });
  
  const cacheRef = useRef<TTSCache>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRequestsRef = useRef<number>(0);
  const requestQueueRef = useRef<Array<() => Promise<void>>>([]);
  const isProcessingQueueRef = useRef(false);

  // Process queued requests with throttling
  const processQueue = useCallback(async () => {
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;

    while (requestQueueRef.current.length > 0) {
      // Wait if we have too many active requests
      while (activeRequestsRef.current >= MAX_CONCURRENT_REQUESTS) {
        await new Promise(r => setTimeout(r, 100));
      }

      const request = requestQueueRef.current.shift();
      if (request) {
        activeRequestsRef.current++;
        request().finally(() => {
          activeRequestsRef.current--;
        });
        // Add delay between starting requests
        await new Promise(r => setTimeout(r, REQUEST_DELAY));
      }
    }

    isProcessingQueueRef.current = false;
  }, []);

  const generateAudio = useCallback(async (
    text: string, 
    voiceId: string,
    previousText?: string,
    nextText?: string
  ): Promise<string | null> => {
    const cacheKey = hashText(text, voiceId);
    
    // Return cached audio if available
    if (cacheRef.current[cacheKey]) {
      console.log('[TTS] Cache hit for:', text.slice(0, 30));
      return cacheRef.current[cacheKey];
    }

    return new Promise((resolve) => {
      const doRequest = async () => {
        try {
          console.log('[TTS] Generating audio for:', text.slice(0, 50), '...');
          
          const response = await fetch(
            `${SUPABASE_URL}/functions/v1/elevenlabs-tts`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
              },
              body: JSON.stringify({ 
                text, 
                voiceId,
                previousText,
                nextText,
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            
            // Handle rate limiting with retry
            if (response.status === 429) {
              console.warn('[TTS] Rate limited, will retry...');
              // Re-queue this request
              requestQueueRef.current.push(doRequest);
              processQueue();
              return;
            }
            
            throw new Error(errorData.error || `TTS request failed: ${response.status}`);
          }

          const data = await response.json();
          
          // Create data URL from base64 audio
          const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
          
          // Cache the result
          cacheRef.current[cacheKey] = audioUrl;
          
          resolve(audioUrl);
        } catch (error) {
          console.error('[TTS] Error generating audio:', error);
          setState(prev => ({ 
            ...prev, 
            error: error instanceof Error ? error.message : 'TTS generation failed' 
          }));
          resolve(null);
        }
      };

      // Add to queue and process
      requestQueueRef.current.push(doRequest);
      processQueue();
    });
  }, [processQueue]);

  const playAudio = useCallback(async (
    text: string,
    voiceId: string,
    previousText?: string,
    nextText?: string,
    onEnd?: () => void
  ): Promise<void> => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const audioUrl = await generateAudio(text, voiceId, previousText, nextText);
      
      if (!audioUrl) {
        throw new Error('Failed to generate audio');
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setState(prev => ({ ...prev, isPlaying: false }));
        audioRef.current = null;
        onEnd?.();
      };

      audio.onerror = () => {
        setState(prev => ({ ...prev, isPlaying: false, error: 'Audio playback failed' }));
        audioRef.current = null;
        onEnd?.(); // Still advance on error
      };

      setState(prev => ({ ...prev, isLoading: false, isPlaying: true }));
      await audio.play();
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        isPlaying: false,
        error: error instanceof Error ? error.message : 'Playback failed' 
      }));
      onEnd?.(); // Advance even on error
    }
  }, [generateAudio]);

  const preloadTranscript = useCallback(async (
    transcript: Array<{ text: string; speakerId: string; voiceId?: string }>,
    getVoiceId: (speakerId: string) => string
  ): Promise<void> => {
    setState(prev => ({ ...prev, preloadProgress: 0 }));

    let completed = 0;
    const total = transcript.length;

    // Queue all preload requests - they will be throttled automatically
    const preloadPromises = transcript.map((turn, i) => {
      const voiceId = turn.voiceId || getVoiceId(turn.speakerId);
      const previousText = i > 0 ? transcript[i - 1].text : undefined;
      const nextText = i < transcript.length - 1 ? transcript[i + 1].text : undefined;

      return generateAudio(turn.text, voiceId, previousText, nextText).then(() => {
        completed++;
        setState(prev => ({ 
          ...prev, 
          preloadProgress: Math.round((completed / total) * 100) 
        }));
      });
    });

    await Promise.all(preloadPromises);
    console.log('[TTS] Preloading complete');
  }, [generateAudio]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const resumeAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current = {};
  }, []);

  return {
    ...state,
    generateAudio,
    playAudio,
    preloadTranscript,
    stopAudio,
    pauseAudio,
    resumeAudio,
    clearCache,
  };
}
