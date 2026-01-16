import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { currentHost, otherHost, topic, conversationHistory, options } = await req.json()

        const recentHistory = conversationHistory.slice(-6).join('\n')
        const toneDesc = {
            casual: 'relaxed, friendly, and conversational with natural humor',
            technical: 'in-depth, precise, and educational with technical details',
            hardcore: 'intense, no-nonsense, and challenging with strong opinions',
            interview: 'structured Q&A format helping prepare for interviews'
        }[options.tone || 'casual']

        const systemPrompt = `You are ${currentHost.name}, a ${currentHost.role} in a podcast conversation.
Your personality: ${currentHost.personality || 'engaging and knowledgeable'}
The tone should be ${toneDesc}.

Respond naturally in 2-3 sentences. Be conversational, engaging, and build on what was just said.
${options.includeExamples ? 'Include concrete examples when relevant.' : ''}
${options.ragContext ? `\n\nReference material:\n${options.ragContext}` : ''}`

        const userPrompt = `Previous conversation:
${recentHistory}

The other host is ${otherHost.name}, a ${otherHost.role}.

What do you say next in this podcast about "${topic}"?`

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'google/gemini-3-flash-preview',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.8,
                max_tokens: 200
            })
        })

        if (!response.ok) {
            throw new Error(`LLM API error: ${response.status}`)
        }

        const data = await response.json()
        const text = data.choices[0].message.content.trim()

        return new Response(
            JSON.stringify({ text }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
