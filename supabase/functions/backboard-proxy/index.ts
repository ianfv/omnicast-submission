import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("BACKBOARD_API_KEY");
    if (!apiKey) {
      console.error('[backboard-proxy] Missing BACKBOARD_API_KEY secret');
      return new Response(
        JSON.stringify({ error: 'Missing API key configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { endpoint, method = 'GET', body } = await req.json();

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Missing endpoint parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiUrl = `https://app.backboard.io/api${endpoint}`;
    console.log(`[backboard-proxy] ${method} ${endpoint}`);

    let upstreamBody: FormData | string | undefined;
    const upstreamHeaders: Record<string, string> = {
      "X-API-Key": apiKey,
    };

    // SPECIAL HANDLING: /messages endpoint requires FormData
    if (endpoint.includes("/messages") && method === "POST") {
      const formData = new FormData();
      if (body && typeof body === 'object') {
        Object.entries(body).forEach(([key, value]) => {
          // Handle all types by converting to string
          if (value !== null && value !== undefined) {
            formData.append(key, String(value));
          }
        });
      }
      upstreamBody = formData;
      // Note: Do NOT set Content-Type header manually for FormData - fetch adds boundary automatically
    } else {
      // Default JSON handling for all other endpoints
      upstreamBody = body ? JSON.stringify(body) : undefined;
      upstreamHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(apiUrl, {
      method,
      headers: upstreamHeaders,
      body: upstreamBody,
    });

    const responseText = await response.text();
    console.log(`[backboard-proxy] Response ${response.status}: ${responseText.substring(0, 200)}...`);

    // Try to parse as JSON, fallback to text
    let responseBody: unknown;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = { raw: responseText };
    }

    return new Response(
      JSON.stringify(responseBody),
      {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[backboard-proxy] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
