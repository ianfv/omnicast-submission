import { useState, useRef, useEffect, useCallback } from 'react';

interface TTSQueueItem {
    text: string;
    voiceId: string;
    audioBuffer?: AudioBuffer;
    fetchPromise?: Promise<ArrayBuffer>;
}

interface UseMultiVoiceTTSProps {
    apiKey: string;
}

export function useMultiVoiceTTS({ apiKey }: UseMultiVoiceTTSProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentVoiceId, setCurrentVoiceId] = useState<string | null>(null);
    const [queue, setQueue] = useState<TTSQueueItem[]>([]); // Expose queue for UI
    const queueRef = useRef<TTSQueueItem[]>([]);

    // Helper to update exposed state
    const updateQueueState = () => setQueue([...queueRef.current]);
    const isPlayingRef = useRef(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Parsing state
    const bufferRef = useRef('');
    const activeVoiceIdRef = useRef<string | null>(null);

    // Initialize AudioContext
    useEffect(() => {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        return () => {
            audioContextRef.current?.close();
        };
    }, []);

    // Fetch audio from ElevenLabs (POST stream)
    const fetchAudioSegment = async (text: string, voiceId: string, signal: AbortSignal): Promise<ArrayBuffer> => {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_turbo_v2_5',
                latency_optimizations: 4,
            }),
            signal,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`TTS API Error: ${response.status} ${errorText}`);
        }

        return response.arrayBuffer();
    };

    const processQueue = useCallback(async () => {
        if (isPlayingRef.current || queueRef.current.length === 0 || !audioContextRef.current) return;

        isPlayingRef.current = true;
        setIsPlaying(true);

        while (queueRef.current.length > 0) {
            if (!isPlayingRef.current) break; // Check for interrupt

            const item = queueRef.current[0]; // Peek
            setCurrentVoiceId(item.voiceId);

            try {
                // Ensure audio is fetched
                let audioData = item.audioBuffer;
                if (!audioData && item.fetchPromise) {
                    const arrayBuffer = await item.fetchPromise;
                    audioData = await audioContextRef.current.decodeAudioData(arrayBuffer);
                    item.audioBuffer = audioData; // Cache it
                }

                if (audioData) {
                    // Play it
                    const source = audioContextRef.current.createBufferSource();
                    source.buffer = audioData;
                    source.connect(audioContextRef.current.destination);

                    await new Promise<void>((resolve) => {
                        source.onended = () => resolve();
                        source.start(0);
                    });
                }

            } catch (err) {
                console.error("Error playing audio segment:", err);
            } finally {
                // Remove processed item
                if (queueRef.current.length > 0 && queueRef.current[0] === item) {
                    queueRef.current.shift();
                    updateQueueState();
                }
            }
        }

        isPlayingRef.current = false;
        setIsPlaying(false);
        setCurrentVoiceId(null);
    }, []);

    const addToQueue = useCallback((text: string, voiceId: string) => {
        if (!abortControllerRef.current) {
            abortControllerRef.current = new AbortController();
        }

        const item: TTSQueueItem = {
            text,
            voiceId,
            fetchPromise: fetchAudioSegment(text, voiceId, abortControllerRef.current.signal)
        };

        queueRef.current.push(item);
        updateQueueState();
        processQueue();
    }, [apiKey, processQueue]);

    // Handle incoming stream text
    const handleStreamChunk = useCallback((chunk: string) => {
        bufferRef.current += chunk;

        // Parse loop
        let keepParsing = true;
        while (keepParsing) {
            keepParsing = false;

            // Check for Delimiter |||
            const delimiterIndex = bufferRef.current.indexOf('|||');

            if (delimiterIndex !== -1) {
                // Extract segment up to delimiter
                const segment = bufferRef.current.substring(0, delimiterIndex).trim();

                // Advance buffer past delimiter
                bufferRef.current = bufferRef.current.substring(delimiterIndex + 3);
                keepParsing = true; // Continue processing invalid or multiple segments

                if (!segment) continue;

                try {
                    // Expecting format: { "voiceId": "...", "speaker": "...", "content": "..." }
                    // Note: The LLM might output newlines or extra whitespace, creating invalid JSON if not careful,
                    // but we assume standard JSON format here.
                    const data = JSON.parse(segment);
                    const { voiceId, content } = data;

                    if (voiceId && content) {
                        // Split content into sentences for lower latency TTS fetching
                        // Matches: (Any characters ending in . ? !) + (space or end of string)
                        // Or just split by non-sentence-ending punctuation?
                        // Simple regex: split by (punctuation + space) but keep delimiter.

                        // Current approach: simple sentence segmentation
                        const sentences = content.match(/[^.?!]+[.?!]+(?=\s|$)|[^.?!]+$/g) || [content];

                        sentences.forEach((sentence: string) => {
                            const trimmed = sentence.trim();
                            if (trimmed) {
                                addToQueue(trimmed, voiceId);
                            }
                        });
                    }
                } catch (e) {
                    console.error("Failed to parse segment as JSON:", segment, e);
                    // Fallback? If it's not JSON, we might want to discard it or log it. 
                    // For now, robustly ignore invalid JSON blocks.
                }
            }
        }
    }, [addToQueue]);

    const clearQueue = useCallback(() => {
        // Abort fetch requests
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = new AbortController(); // Reset
        }

        // Clear queue
        queueRef.current = [];
        updateQueueState();

        // Stop playback (close/suspend context or disconnect??)
        // To stop immediately: suspend context or close current source. 
        // Here we just mark playing as false to break the loop, but actual audio takes time to stop 
        // unless we track the active source node. For simplicity V1:
        isPlayingRef.current = false;

        if (audioContextRef.current?.state === 'running') {
            audioContextRef.current.suspend().then(() => audioContextRef.current?.resume());
            // Re-creating or resetting context might be cleaner for a hard stop
        }

        bufferRef.current = '';
        setIsPlaying(false);
        setCurrentVoiceId(null);
    }, []);

    return {
        handleStreamChunk,
        clearQueue,
        isPlaying,
        currentVoiceId,
        queue
    };
}
