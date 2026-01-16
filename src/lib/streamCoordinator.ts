/**
 * Stream Coordinator - The "Bucket Brigade" Pipeline
 * 
 * This module connects the "Brain" (Backboard) to the "Mouth" (ElevenLabs).
 * It implements sentence buffering for instant audio playback while text
 * is still being generated.
 * 
 * The Pipeline:
 * 1. Backboard streams tokens: "Hel", "lo", " ", "there", ".", " ", "How"...
 * 2. Buffer catches tokens until punctuation: "Hello there."
 * 3. Immediately blast complete sentence to ElevenLabs
 * 4. While sentence 1 is playing, sentence 2 is being generated
 * 
 * Result: User hears audio in ~800ms instead of waiting 5+ seconds
 */

import { streamAudio, AudioStreamController } from './audioStream';
import { generateNextTurnStream } from './backboard';

/**
 * Clean text before sending to TTS.
 * Removes speaker prefixes like "Alex:", "Host 1:", "Emma:" etc.
 */
function cleanTextForTTS(text: string): string {
  // Remove speaker prefixes at the start of text (e.g., "Alex: Hello" -> "Hello")
  // Pattern: Name/label followed by colon at the start
  let cleaned = text.replace(/^[A-Za-z0-9\s]+:\s*/g, '').trim();

  // Also remove any that appear mid-dialog after sentence breaks
  // (e.g., "That's great. Alex: What do you think?" -> "That's great. What do you think?")
  cleaned = cleaned.replace(/\.\s*[A-Za-z0-9\s]+:\s*/g, '. ').trim();

  return cleaned;
}

/** Return type with spoken history for interruption handling */
export interface SpeakingChainResult {
  /** All text that was actually spoken to the user */
  spokenText: string;
  /** Whether the chain completed or was interrupted */
  completed: boolean;
}

/**
 * Starts the streaming pipeline from Backboard to ElevenLabs.
 * 
 * Returns when the full turn is complete OR when interrupted.
 * 
 * @param threadId - The Backboard thread ID
 * @param voiceId - The ElevenLabs voice ID
 * @param onSentenceStart - Callback when each sentence starts playing
 * @param signal - Optional AbortSignal to cancel playback immediately
 * @returns Result with spoken text for interruption handling
 */
export async function startSpeakingChain(
  threadId: string,
  voiceId: string,
  onSentenceStart?: (sentence: string) => void,
  signal?: AbortSignal
): Promise<SpeakingChainResult> {
  // 1. Start the Brain - get the text stream
  const textStream = await generateNextTurnStream(threadId, signal);

  let sentenceBuffer = "";
  let spokenText = "";
  const sentenceEndings = /[.!?]/;
  let currentAudio: AudioStreamController | null = null;

  // 2. Read the Brain's thoughts in real-time
  const reader = textStream.getReader();
  const decoder = new TextDecoder();
  let streamBuffer = ""; // Buffer for partial lines

  // Clean up if aborted
  if (signal) {
    signal.addEventListener('abort', () => {
      console.log("[StreamCoordinator] Abort signal received");
      currentAudio?.stop();
    });
  }

  try {
    while (true) {
      // Check abort before reading
      if (signal?.aborted) throw new Error('Aborted');

      const { done, value } = await reader.read();

      // Decode chunk and add to buffer
      // { stream: true } keeps the internal state of decoder if multibyte char is split
      const chunk = decoder.decode(value, { stream: !done });
      streamBuffer += chunk;

      if (done && !streamBuffer.trim()) break;

      // Extract complete lines
      const lines = streamBuffer.split('\n');
      // Keep the last part in buffer (it might be incomplete) unless we are done
      streamBuffer = done ? "" : (lines.pop() || "");

      let textChunk = "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine.startsWith('data:')) {
          let jsonStr = "";
          try {
            jsonStr = trimmedLine.slice(5).trim(); // remove 'data:'
            if (jsonStr === '[DONE]') continue;

            const data = JSON.parse(jsonStr);

            // CRITICAL: Filter out the echo of our own instructions
            // Check both 'role' (standard) and 'type' (Backboard specific user_message event)
            if (data.role === 'user' || data.type === 'user_message') {
              continue;
            }

            // extract content from common fields
            if (data.delta?.content) textChunk += data.delta.content;
            else if (data.content) textChunk += data.content;
            else if (data.text) textChunk += data.text;

            // Note: If no content field, we simply ignore. 
            // Do NOT fallback to appending raw text for parsed JSON.

          } catch (e) {
            console.warn("[StreamCoordinator] Failed to parse SSE JSON:", trimmedLine);
            // Only append as raw text if it DOESN'T look like JSON
            // If it starts with '{', it was probably valid JSON that we failed to handle, so skip it to be safe
            if (!jsonStr.startsWith('{')) {
              textChunk += jsonStr + " ";
            }
          }
        } else {
          // Treat non-data lines as content (carefully)
          // If it looks like JSON or metadata, skip it
          if (!trimmedLine.startsWith('{') && !trimmedLine.startsWith('[')) {
            textChunk += trimmedLine + " ";
          }
        }
      }


      sentenceBuffer += textChunk;

      // 3. Check if we have a full sentence
      let match;
      while ((match = sentenceBuffer.match(sentenceEndings))) {
        // Check abort before playing
        if (signal?.aborted) throw new Error('Aborted');

        const punctuationIndex = match.index! + 1;
        const completeSentence = sentenceBuffer.slice(0, punctuationIndex).trim();

        // 4. BLAST IT TO ELEVENLABS IMMEDIATELY
        if (completeSentence) {
          // Clean any speaker prefixes before TTS
          const cleanedText = cleanTextForTTS(completeSentence);

          if (cleanedText) {
            console.log("[StreamCoordinator] Speaking chunk:", cleanedText);

            // Notify listener with cleaned text
            onSentenceStart?.(cleanedText);

            // Create audio controller but DON'T await - we want it to start immediately
            currentAudio = streamAudio(cleanedText, voiceId);

            // Start playing (this returns a promise when audio ends)
            try {
              await currentAudio.play();
            } catch (playError) {
              // If play was aborted/stopped, we might catch here depending on impl
              // But usually stop() acts silently or throws AbortError
              if (signal?.aborted) throw new Error('Aborted');
            }

            // Track what was spoken (use cleaned text)
            spokenText += (spokenText ? " " : "") + cleanedText;
          }
        }

        // Remove spoken part from buffer
        sentenceBuffer = sentenceBuffer.slice(punctuationIndex);
      }
    }

    // Speak any remaining text (no punctuation at end)
    if (sentenceBuffer.trim() && !signal?.aborted) {
      const cleanedFinal = cleanTextForTTS(sentenceBuffer.trim());

      if (cleanedFinal) {
        console.log("[StreamCoordinator] Speaking final chunk:", cleanedFinal);
        onSentenceStart?.(cleanedFinal);

        currentAudio = streamAudio(cleanedFinal, voiceId);
        await currentAudio.play();

        spokenText += (spokenText ? " " : "") + cleanedFinal;
      }
    }

    return {
      spokenText,
      completed: true,
    };

  } catch (error) {
    // If interrupted or error occurs, stop current audio
    currentAudio?.stop();

    // Don't log aborts as errors
    if ((error as Error).message === 'Aborted' || signal?.aborted) {
      console.log("[StreamCoordinator] Chain aborted by user");
    } else {
      console.log("[StreamCoordinator] Chain interrupted/errored", {
        spokenSoFar: spokenText.length,
        error,
      });
    }

    return {
      spokenText,
      completed: false,
    };
  } finally {
    // Clean up the reader
    reader.releaseLock();
  }
}

/**
 * Speaks a single turn without streaming (fallback for non-streaming mode).
 * 
 * @param text - Complete text to speak
 * @param voiceId - ElevenLabs voice ID
 * @param signal - Optional AbortSignal to cancel playback
 */
export async function speakTurn(text: string, voiceId: string, signal?: AbortSignal): Promise<void> {
  console.log("[StreamCoordinator] Speaking complete turn:", text.slice(0, 50));

  const controller = streamAudio(text, voiceId);

  if (signal) {
    signal.addEventListener('abort', () => {
      controller.stop();
    });
  }

  try {
    // Check before playing
    if (signal?.aborted) return;
    await controller.play();
  } catch (error) {
    if (signal?.aborted) return;
    throw error;
  }
}
