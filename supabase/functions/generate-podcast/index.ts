import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * @deprecated This function is deprecated as of 2026-01-14.
 * The application has pivoted to real-time conversational podcasts using Backboard.io.
 * This function is preserved for generating initial opening lines only.
 * 
 * For real-time conversations, use the Backboard.io Thread API via src/lib/backboard.ts
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HostConfig {
  id: string;
  name: string;
  role: string;
}

interface PodcastSettings {
  length: 'short' | 'medium' | 'long';
  tone: 'casual' | 'technical' | 'hardcore' | 'interview';
  includeExamples: boolean;
  askQuestions: boolean;
  useRag: boolean;
}

interface RagChunk {
  id: string;
  fileId: string;
  fileName: string;
  text: string;
  relevanceScore: number;
}

interface TranscriptTurn {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  timestamp: number;
}

const LENGTH_TURNS = {
  short: 8,
  medium: 14,
  long: 22,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Support both old format (prompt, hosts, settings, ragChunks) and new format (topic, hosts, ragContext)
    const prompt = body.prompt || body.topic || 'General Discussion';
    const hosts = body.hosts || [];
    const settings = body.settings || { length: 'medium', tone: 'casual', includeExamples: true, askQuestions: true, useRag: false };
    const ragChunks = body.ragChunks || [];
    const ragContextFromClient = body.ragContext || '';

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const turnCount = LENGTH_TURNS[settings.length as keyof typeof LENGTH_TURNS] || LENGTH_TURNS.medium;

    const toneDescriptions: Record<string, string> = {
      casual: "relaxed, friendly, and conversational with natural humor",
      technical: "in-depth, precise, and educational with technical details",
      hardcore: "intense, no-nonsense, and challenging with strong opinions",
      interview: "structured Q&A format helping prepare for interviews",
    };

    // Support both ragChunks array and raw ragContext string
    const ragContext = ragContextFromClient 
      ? `\n\nReference material from uploaded documents:\n${ragContextFromClient}`
      : ragChunks.length > 0 
        ? `\n\nReference material from uploaded documents:\n${ragChunks.map((c: RagChunk) => `- From "${c.fileName}": ${c.text}`).join('\n')}`
        : '';

    const systemPrompt = `You are a podcast script generator. Create a natural, engaging podcast conversation between two hosts.

HOSTS:
- ${hosts[0].name} (${hosts[0].role})
- ${hosts[1].name} (${hosts[1].role})

REQUIREMENTS:
1. Generate EXACTLY ${turnCount} dialogue turns, alternating between hosts
2. DO NOT start with "Welcome to" or any podcast name - start directly with engaging content about the topic
3. The tone should be ${toneDescriptions[settings.tone]}
4. Each host should speak from their expertise as a ${hosts[0].role} and ${hosts[1].role}
${settings.includeExamples ? '5. Include concrete real-world examples and case studies' : ''}
${settings.askQuestions ? '6. Hosts should ask each other thought-provoking questions' : ''}

OUTPUT FORMAT:
Return a JSON array of dialogue turns. Each turn must have:
- speakerId: "${hosts[0].id}" or "${hosts[1].id}"
- speakerName: "${hosts[0].name}" or "${hosts[1].name}"
- text: The dialogue (2-4 sentences, natural speech)

Example format:
[
  {"speakerId": "${hosts[0].id}", "speakerName": "${hosts[0].name}", "text": "So I've been diving deep into..."},
  {"speakerId": "${hosts[1].id}", "speakerName": "${hosts[1].name}", "text": "That's interesting because from my perspective..."}
]

Keep it natural - use contractions, occasional filler words, and genuine reactions.${ragContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create a podcast conversation about: ${prompt}` }
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits required. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to generate podcast" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in response");
    }

    // Parse the JSON response
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse transcript from response");
      }
    }

    // Handle both array and object with transcript property
    const turns = Array.isArray(parsedContent) ? parsedContent : parsedContent.transcript || parsedContent.turns || parsedContent.dialogue;

    if (!Array.isArray(turns)) {
      throw new Error("Invalid transcript format");
    }

    // Format the transcript with IDs and timestamps
    const transcript: TranscriptTurn[] = turns.map((turn: any, index: number) => ({
      id: `turn-${index}`,
      speakerId: turn.speakerId,
      speakerName: turn.speakerName,
      text: turn.text,
      timestamp: index * 12,
    }));

    // Generate a title
    const titleResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Generate a catchy, short podcast episode title (max 60 chars). Return only the title, no quotes or explanation." },
          { role: "user", content: `Topic: ${prompt}` }
        ],
      }),
    });

    let title = `${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}`;
    if (titleResponse.ok) {
      const titleData = await titleResponse.json();
      const generatedTitle = titleData.choices?.[0]?.message?.content?.trim();
      if (generatedTitle) {
        title = generatedTitle.replace(/^["']|["']$/g, '');
      }
    }

    return new Response(JSON.stringify({
      id: `podcast-${Date.now()}`,
      title,
      prompt,
      transcript,
      ragChunks,
      createdAt: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating podcast:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
