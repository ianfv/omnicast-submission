import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map internal voice IDs to ElevenLabs voice IDs
const VOICE_MAP: Record<string, string> = {
  'male-deep': 'nPczCjzI2devNBz1zQrb', // Brian - deep male
  'male-calm': 'onwK4e9ZLuTAKqWW03F9', // Daniel - calm male
  'female-warm': 'EXAVITQu4vr4xnSDxMaL', // Sarah - warm female
  'female-energetic': 'cgSgspJ2msm6clMCkdW9', // Jessica - energetic female
  'british-crisp': 'JBFqnCBsd6RMkjVDRZzb', // George - British crisp
};

interface TTSRequest {
  text: string;
  voiceId: string;
  previousText?: string;
  nextText?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    
    if (!ELEVENLABS_API_KEY) {
      console.error("ELEVENLABS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "ElevenLabs API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text, voiceId, previousText, nextText }: TTSRequest = await req.json();

    if (!text || !voiceId) {
      return new Response(
        JSON.stringify({ error: "Missing text or voiceId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map internal voice ID to ElevenLabs voice ID
    const elevenLabsVoiceId = VOICE_MAP[voiceId] || VOICE_MAP['male-calm'];

    console.log(`[ElevenLabs TTS] Generating audio for voice: ${voiceId} -> ${elevenLabsVoiceId}`);
    console.log(`[ElevenLabs TTS] Text length: ${text.length} chars`);

    // Build request body with optional stitching context
    const requestBody: Record<string, unknown> = {
      text,
      model_id: "eleven_turbo_v2_5", // Fast, high quality
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.4, // Slightly expressive for podcast
        use_speaker_boost: true,
        speed: 1.0,
      },
    };

    // Add stitching context if provided (for natural transitions)
    if (previousText) {
      requestBody.previous_text = previousText;
    }
    if (nextText) {
      requestBody.next_text = nextText;
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ElevenLabs TTS] API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `ElevenLabs API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = base64Encode(audioBuffer);

    console.log(`[ElevenLabs TTS] Generated audio: ${audioBuffer.byteLength} bytes`);

    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio,
        voiceId: elevenLabsVoiceId,
        textLength: text.length,
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("[ElevenLabs TTS] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
