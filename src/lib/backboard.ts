import { supabase } from '@/integrations/supabase/client';

// Types representing Backboard Resources
export interface SessionConfig {
  userId: string;
  systemPrompt: string;
  initialContext: string;
  hostName: string;
  hostRole: string;
  hostPersonality: string;
  coHosts?: Array<{ name: string; role: string; personality: string }>;
  ragContext?: string;
}

export interface TurnResult {
  text: string;
  messageId: string;
  runId: string;
}

export interface Assistant {
  assistant_id: string;
  name: string;
}

export interface Thread {
  thread_id: string;
}

export interface Message {
  message_id: string;
  content: string;
  role: 'user' | 'assistant';
}

// Custom Error Class
export class BackboardError extends Error {
  constructor(
    message: string,
    public code: 'API_ERROR' | 'NETWORK_ERROR' | 'AUTH_ERROR' | 'PROXY_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'BackboardError';
  }
}

// ------------------------------------------------------------------
// HELPER FUNCTIONS (Prompt Builders)
// ------------------------------------------------------------------

function buildSystemPrompt(config: {
  hostName: string;
  hostRole: string;
  hostPersonality: string;
  coHosts?: Array<{ name: string; role: string; personality: string }>;
  ragContext?: string;
  basePrompt: string;
}): string {
  // Build co-host info string
  const coHostInfo = config.coHosts && config.coHosts.length > 0
    ? `\n\nYOUR CO-HOSTS:\n${config.coHosts.map(h => `- ${h.name}: ${h.role} (${h.personality})`).join('\n')}`
    : '';

  let prompt = `You are a podcast host named ${config.hostName}.
Role: ${config.hostRole}
Personality: ${config.hostPersonality}
${coHostInfo}

CORE GUIDELINES:
- Speak naturally, like a human podcaster.
- Use ahs, ums, and pauses occasionally to sound authentic.
- Be engaging, energetic, and inquisitive.
- Never mention you are an AI.
- Keep responses relatively short (2-4 sentences) to allow for back-and-forth, unless explaining a complex topic.
- Do NOT address your co-hosts by name. Just continue the conversation naturally without saying their names.
- DO NOT prefix your dialogue with your name or any speaker label (e.g., don't write "Alex: Hello", just write "Hello").
- Output ONLY your spoken dialogue, nothing else.

${config.ragContext ? `\nCONTEXT DOCUMENTS:\n${config.ragContext}\n` : ''}

${config.basePrompt}`;

  return prompt;
}

function buildTurnInstructions(): string {
  return `Generate the next segment of the podcast dialogue.
  
CRITICAL REQUIREMENTS:
- Output ONLY 2-3 sentences (approximately 50 words maximum)
- Write as natural spoken dialogue
- End at a natural pause point
- Do NOT include speaker names or labels (e.g., "Alex:" or "Host 1:") - output only the spoken words
- Do NOT include any meta-commentary or stage directions`;
}

function buildInterruptionWithContext(
  userInput: string,
  spokenHistory: string,
  unspokenTranscript: string
): string {
  return `[INTERRUPTION SENT BY USER]
  
The user just interrupted the podcast.

CONTEXT SO FAR (Spoken):
"...${spokenHistory.slice(-500)}"

CONTEXT THAT WAS CUT OFF (Do NOT repeat this verbatim, but summarize if needed):
"${unspokenTranscript}"

USER SAID:
"${userInput}"

INSTRUCTIONS:
1. Acknowledge the user's input/question naturally.
2. Answer it briefly or weave it into the discussion.
3. Transition back to the main topic if appropriate.
4. Keep the response conversational and spoken-style.`;
}

// ------------------------------------------------------------------
// API CLIENT
// ------------------------------------------------------------------

const BACKBOARD_API_KEY = import.meta.env.VITE_BACKBOARD_API_KEY;

/**
 * Helper to convert object to FormData
 */
function toFormData(data: Record<string, any>): FormData {
  const formData = new FormData();
  for (const key in data) {
    if (data[key] !== undefined && data[key] !== null) {
      formData.append(key, String(data[key]));
    }
  }
  return formData;
}

/**
 * Proxies requests.
 */
async function backboardFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isDev = import.meta.env.DEV;

  if (isDev) {
    // -----------------------------------------------------------------------
    // LOCAL DEV STRATEGY (Vite Proxy)
    // -----------------------------------------------------------------------
    if (!BACKBOARD_API_KEY) {
      console.warn("[Backboard] Missing VITE_BACKBOARD_API_KEY for local dev. Requests might fail.");
    }

    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `/api/backboard${normalizedEndpoint}`;

    // Determine headers
    const headers: HeadersInit = {
      "X-API-Key": BACKBOARD_API_KEY || "",
      ...(options.headers || {}),
    };

    // Only set Content-Type to json if we are NOT sending FormData
    // If sending FormData, browser sets it with boundary automatically
    if (!(options.body instanceof FormData)) {
      (headers as any)["Content-Type"] = "application/json";
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Backboard Dev] API Error (${response.status}):`, errorText);
        throw new BackboardError(
          `Dev Proxy request failed: ${response.status} ${response.statusText}`,
          "API_ERROR",
          { body: errorText }
        );
      }

      if (response.status === 204) return {} as T;
      return await response.json();

    } catch (err) {
      if (err instanceof BackboardError) throw err;
      console.error(`[Backboard Dev] Request failed: ${url}`, err);
      throw new BackboardError("Network request failed", "NETWORK_ERROR", err);
    }

  } else {
    // -----------------------------------------------------------------------
    // PRODUCTION STRATEGY (Edge Function)
    // -----------------------------------------------------------------------
    // TODO: The Edge Function currently only expects JSON bodies. 
    // If Backboard REQUIRES multipart/form-data for messages, we will need to 
    // update the Edge Function to handle that before going to production.
    // For now, this path might fail for /messages calls if JSON isn't accepted.

    // Convert FormData to JSON for the proxy if possible, or warn
    let body = options.body;
    if (body instanceof FormData) {
      const obj: any = {};
      body.forEach((value, key) => obj[key] = value);
      body = JSON.stringify(obj);
    }

    const payload = {
      endpoint,
      method: options.method || 'GET',
      body: body ? (typeof body === 'string' ? JSON.parse(body) : body) : undefined
    };

    try {
      const { data, error } = await supabase.functions.invoke('backboard-proxy', {
        body: payload
      });

      if (error) {
        console.error(`[Backboard Prod] Proxy Error:`, error);
        throw new BackboardError(
          `Proxy request failed: ${error.message}`,
          "PROXY_ERROR",
          error
        );
      }

      return data as T;
    } catch (err) {
      if (err instanceof BackboardError) throw err;
      console.error(`[Backboard Prod] Request failed: ${endpoint}`, err);
      throw new BackboardError("Network request failed", "NETWORK_ERROR", err);
    }
  }
}

/**
 * Initializes a new podcast session.
 * Flow: Create Assistant -> Create Thread -> Send Initial Context
 */
export async function initializeSession(config: SessionConfig): Promise<string> {
  // 1. Build System Prompt
  const enhancedSystemPrompt = buildSystemPrompt({
    hostName: config.hostName,
    hostRole: config.hostRole,
    hostPersonality: config.hostPersonality,
    coHosts: config.coHosts,
    ragContext: config.ragContext,
    basePrompt: config.systemPrompt
  });

  console.log("[Backboard] Creating Assistant...");

  // 2. Create Assistant (JSON is fine for Assistants)
  const assistant = await backboardFetch<Assistant>('/assistants', {
    method: 'POST',
    body: JSON.stringify({
      name: `Omnicast Host - ${config.hostName || 'Host'}`,
      description: config.hostRole,
      system_prompt: enhancedSystemPrompt,
      embedding_provider: "openai",
      embedding_model_name: "text-embedding-3-large",
      embedding_dims: 3072
    })
  });

  console.log("[Backboard] Assistant Created:", assistant.assistant_id);

  // 3. Create Thread (JSON is fine for Threads)
  const thread = await backboardFetch<Thread>(`/assistants/${assistant.assistant_id}/threads`, {
    method: 'POST',
    body: JSON.stringify({})
  });

  console.log("[Backboard] Thread Created:", thread.thread_id);

  // 4. Send Initial Context (MUST USE FORM DATA for Messages)
  const messageData = toFormData({
    content: `CONTEXT: The user wants to listen to a podcast about: "${config.initialContext}". \n\nStart by introducing yourself and the topic. Keep it brief and engaging.`,
    role: 'user',
    send_to_llm: false // Don't generate yet
  });

  await backboardFetch<Message>(`/threads/${thread.thread_id}/messages`, {
    method: 'POST',
    body: messageData
  });

  return thread.thread_id;
}

/**
 * Generates the next turn by sending specific instructions as a user message.
 */
export async function generateNextTurn(threadId: string): Promise<TurnResult> {
  const instructions = buildTurnInstructions();

  // Trigger generation via message (MUST USE FORM DATA)
  const formData = toFormData({
    content: instructions,
    role: 'user',
    send_to_llm: true,
    memory: 'Auto'
  });

  const response = await backboardFetch<Message>(`/threads/${threadId}/messages`, {
    method: 'POST',
    body: formData
  });

  return {
    text: response.content || "",
    messageId: response.message_id || `msg_${Date.now()}`,
    runId: 'implicit'
  };
}

/**
 * Generates the next turn with STREAMING support.
 */
export async function generateNextTurnStream(
  threadId: string,
  signal?: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
  console.log("[Backboard] Starting stream...");
  const instructions = buildTurnInstructions();
  const isDev = import.meta.env.DEV;

  let response: Response;

  if (isDev) {
    // DEV: Use Vite Proxy
    console.log("[Backboard] Using Vite Proxy for streaming");

    if (!BACKBOARD_API_KEY) {
      throw new Error("Missing VITE_BACKBOARD_API_KEY for local dev streaming");
    }

    // Must use FormData
    const formData = toFormData({
      content: instructions,
      role: 'user',
      send_to_llm: true,
      memory: 'Auto',
      stream: true
    });

    response = await fetch(`/api/backboard/threads/${threadId}/messages`, {
      method: "POST",
      headers: {
        // No Content-Type (FormData sets it)
        "X-API-Key": BACKBOARD_API_KEY,
      },
      body: formData,
      signal
    });

  } else {
    // PROD: Use Edge Function
    // This part likely needs refactoring for FormData too, but stuck for now.
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const functionUrl = `${supabaseUrl}/functions/v1/backboard-proxy`;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

    // TODO: Update Proxy to handle FormData / different payload structure check
    const proxyBody = {
      endpoint: `/threads/${threadId}/messages`,
      method: 'POST',
      body: {
        content: instructions,
        role: 'user',
        send_to_llm: true,
        memory: 'Auto',
        stream: true
      }
    };

    response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(proxyBody),
      signal
    });
  }

  if (!response.ok || !response.body) {
    const errText = await response.text();
    throw new Error(`Failed to start stream: ${response.status} - ${errText}`);
  }

  return response.body;
}

/**
 * Handles Interruption:
 * 1. Build context with unspoken text + user input
 * 2. Send as new message to trigger response
 */
export async function handleInterruption(
  threadId: string,
  spokenHistory: string,
  unspokenTranscript: string,
  userInput: string
): Promise<TurnResult> {
  console.log("[Backboard] Handling interruption...");

  // Build the prompt that includes the context of what was cut off
  const contextualPrompt = buildInterruptionWithContext(
    userInput,
    spokenHistory,
    unspokenTranscript
  );

  // Trigger generation (MUST USE FORM DATA)
  const formData = toFormData({
    content: contextualPrompt,
    role: 'user',
    send_to_llm: true,
    memory: 'Auto'
  });

  const response = await backboardFetch<Message>(`/threads/${threadId}/messages`, {
    method: 'POST',
    body: formData
  });

  return {
    text: response.content || "",
    messageId: response.message_id || `msg_${Date.now()}`,
    runId: 'implicit'
  };
}

/**
 * Ends a session (optional cleanup).
 */
export async function endSession(threadId: string): Promise<void> {
  // Backboard cleans up automatically, but we could delete logic here if needed
  console.log('[Backboard] Session ended:', threadId);
  return Promise.resolve();
}
