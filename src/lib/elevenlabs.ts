/**
 * ElevenLabs TTS Integration
 * 
 * TODO: Integrate with ElevenLabs API for real text-to-speech generation
 * 
 * Prerequisites:
 * 1. Add ELEVENLABS_API_KEY to environment variables
 * 2. Map voice IDs to actual ElevenLabs voice IDs
 * 3. Handle audio streaming and caching
 * 
 * ElevenLabs Voice IDs (examples):
 * - "21m00Tcm4TlvDq8ikWAM" - Rachel (female)
 * - "AZnzlk1XvdvUeBnXmlld" - Domi (female)
 * - "EXAVITQu4vr4xnSDxMaL" - Bella (female)
 * - "ErXwobaYiN019PkySvjV" - Antoni (male)
 * - "VR6AewLTigWG4xSOukaG" - Arnold (male)
 */

export interface AudioBlob {
  blob: Blob;
  duration: number;
}

export interface ElevenLabsConfig {
  apiKey: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

/**
 * Generate speech audio from text using ElevenLabs
 * 
 * TODO: Implement actual API call
 * 
 * @param text - The text to convert to speech
 * @param voiceId - The ElevenLabs voice ID to use
 * @param config - Optional configuration overrides
 * @returns Promise resolving to audio blob with duration
 */
export async function generateSpeech(
  text: string,
  voiceId: string,
  config?: Partial<ElevenLabsConfig>
): Promise<AudioBlob> {
  // TODO: Replace with actual ElevenLabs API call
  // 
  // const response = await fetch(
  //   `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
  //   {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'xi-api-key': config?.apiKey || process.env.ELEVENLABS_API_KEY,
  //     },
  //     body: JSON.stringify({
  //       text,
  //       model_id: config?.modelId || 'eleven_monolingual_v1',
  //       voice_settings: {
  //         stability: config?.stability || 0.5,
  //         similarity_boost: config?.similarityBoost || 0.75,
  //       },
  //     }),
  //   }
  // );
  // 
  // const audioBlob = await response.blob();
  // return { blob: audioBlob, duration: estimateDuration(text) };

  console.log('[ElevenLabs] generateSpeech called (demo mode)', { text: text.slice(0, 50), voiceId });
  
  // Return mock data for demo
  return {
    blob: new Blob([], { type: 'audio/mpeg' }),
    duration: Math.ceil(text.length / 15), // Rough estimate: 15 chars per second
  };
}

/**
 * Map internal voice IDs to ElevenLabs voice IDs
 * 
 * TODO: Update with actual ElevenLabs voice IDs
 */
export const VOICE_ID_MAP: Record<string, string> = {
  'male-deep': 'nPczCjzI2devNBz1zQrb', // Brian - deep male
  'male-calm': 'onwK4e9ZLuTAKqWW03F9', // Daniel - calm male
  'female-warm': 'EXAVITQu4vr4xnSDxMaL', // Sarah - warm female
  'female-energetic': 'cgSgspJ2msm6clMCkdW9', // Jessica - energetic female
  'british-crisp': 'JBFqnCBsd6RMkjVDRZzb', // George - British crisp
};

/**
 * Check if ElevenLabs API is configured and available
 * Now that we have the edge function, this returns true
 */
export function isElevenLabsAvailable(): boolean {
  return true;
}

/**
 * Generate audio for an entire transcript
 * 
 * TODO: Implement batch generation with progress callback
 */
export async function generateTranscriptAudio(
  transcript: Array<{ text: string; voiceId: string }>,
  onProgress?: (index: number, total: number) => void
): Promise<AudioBlob[]> {
  const results: AudioBlob[] = [];
  
  for (let i = 0; i < transcript.length; i++) {
    const { text, voiceId } = transcript[i];
    const audio = await generateSpeech(text, voiceId);
    results.push(audio);
    onProgress?.(i + 1, transcript.length);
  }
  
  return results;
}
