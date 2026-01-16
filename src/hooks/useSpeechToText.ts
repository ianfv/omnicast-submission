/**
 * useSpeechToText Hook
 * 
 * Records audio from the user's microphone and transcribes it using
 * ElevenLabs Speech-to-Text API.
 */

import { useState, useRef, useCallback } from 'react';

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_STT_URL = 'https://api.elevenlabs.io/v1/speech-to-text';

export interface UseSpeechToTextResult {
    /** Whether currently recording audio */
    isRecording: boolean;
    /** Whether transcription is in progress */
    isTranscribing: boolean;
    /** The transcribed text from the last recording */
    transcript: string;
    /** Any error that occurred */
    error: string | null;
    /** Start recording audio from microphone */
    startRecording: () => Promise<void>;
    /** Stop recording and transcribe the audio */
    stopRecording: () => Promise<string>;
    /** Clear the current transcript and error */
    reset: () => void;
}

export function useSpeechToText(): UseSpeechToTextResult {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    const startRecording = useCallback(async () => {
        try {
            setError(null);
            setTranscript('');

            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000, // Good for speech recognition
                }
            });
            streamRef.current = stream;

            // Determine supported mime type
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : 'audio/mp4';

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start(100); // Collect data every 100ms
            setIsRecording(true);
            console.log('[STT] Recording started');

        } catch (err) {
            console.error('[STT] Failed to start recording:', err);
            if ((err as Error).name === 'NotAllowedError') {
                setError('Microphone access denied. Please allow microphone access in your browser settings.');
            } else if ((err as Error).name === 'NotFoundError') {
                setError('No microphone found. Please connect a microphone and try again.');
            } else {
                setError('Failed to access microphone. Please try again.');
            }
            throw err;
        }
    }, []);

    const stopRecording = useCallback(async (): Promise<string> => {
        return new Promise((resolve, reject) => {
            const mediaRecorder = mediaRecorderRef.current;

            if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                setIsRecording(false);
                reject(new Error('No active recording'));
                return;
            }

            mediaRecorder.onstop = async () => {
                console.log('[STT] Recording stopped, transcribing...');
                setIsRecording(false);
                setIsTranscribing(true);

                // Stop all tracks to release microphone
                streamRef.current?.getTracks().forEach(track => track.stop());
                streamRef.current = null;

                try {
                    // Create audio blob from chunks
                    const audioBlob = new Blob(audioChunksRef.current, {
                        type: mediaRecorder.mimeType
                    });

                    console.log('[STT] Audio blob size:', audioBlob.size, 'bytes');

                    if (audioBlob.size < 1000) {
                        throw new Error('Recording too short. Please speak for longer.');
                    }

                    // Send to ElevenLabs STT API
                    const transcribedText = await transcribeAudio(audioBlob);

                    setTranscript(transcribedText);
                    setIsTranscribing(false);
                    console.log('[STT] Transcription complete:', transcribedText);
                    resolve(transcribedText);

                } catch (err) {
                    console.error('[STT] Transcription failed:', err);
                    setError((err as Error).message || 'Transcription failed');
                    setIsTranscribing(false);
                    reject(err);
                }
            };

            mediaRecorder.stop();
        });
    }, []);

    const reset = useCallback(() => {
        setTranscript('');
        setError(null);
    }, []);

    return {
        isRecording,
        isTranscribing,
        transcript,
        error,
        startRecording,
        stopRecording,
        reset,
    };
}

/**
 * Transcribe audio blob using ElevenLabs STT API
 */
async function transcribeAudio(audioBlob: Blob): Promise<string> {
    if (!ELEVENLABS_API_KEY) {
        throw new Error('ElevenLabs API key not configured');
    }

    const formData = new FormData();

    // Determine file extension from mime type
    const mimeType = audioBlob.type;
    let extension = 'webm';
    if (mimeType.includes('mp4')) extension = 'mp4';
    else if (mimeType.includes('wav')) extension = 'wav';
    else if (mimeType.includes('webm')) extension = 'webm';

    formData.append('file', audioBlob, `recording.${extension}`);
    formData.append('model_id', 'scribe_v2');

    const response = await fetch(ELEVENLABS_STT_URL, {
        method: 'POST',
        headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[STT] API error:', response.status, errorText);
        throw new Error(`Transcription failed: ${response.status}`);
    }

    const data = await response.json();

    // Handle different response formats
    if (typeof data.text === 'string') {
        return data.text.trim();
    } else if (data.transcription) {
        return data.transcription.trim();
    } else {
        console.warn('[STT] Unexpected response format:', data);
        return JSON.stringify(data);
    }
}
