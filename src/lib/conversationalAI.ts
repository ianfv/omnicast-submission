/**
 * Conversational AI Module
 * Orchestrates real-time conversation between podcast hosts
 */

import { HostConfig } from '@/types/podcast';
import { supabase } from '@/integrations/supabase/client';

export interface TranscriptSegment {
    hostIndex: number;
    hostName: string;
    text: string;
}

export interface ConversationOptions {
    turnCount?: number;
    tone?: 'casual' | 'technical' | 'hardcore' | 'interview';
    includeExamples?: boolean;
    ragContext?: string;
}

/**
 * Generate a single conversation turn based on history using Edge Function
 */
async function generateNextTurn(
    currentHost: HostConfig,
    otherHost: HostConfig,
    topic: string,
    conversationHistory: string[],
    options: ConversationOptions
): Promise<string> {
    try {
        const response = await supabase.functions.invoke('generate-turn', {
            body: {
                currentHost,
                otherHost,
                topic,
                conversationHistory,
                options
            }
        });

        if (response.error) {
            throw new Error(`Edge Function error: ${response.error.message}`);
        }

        return response.data.text;
    } catch (error) {
        console.error('Error generating turn:', error);
        throw error;
    }
}

/**
 * Generate dynamic conversation between hosts in real-time
 * Calls onTurnGenerated callback for each segment (for streaming playback)
 */
export async function generateDynamicConversation(
    hosts: HostConfig[],
    topic: string,
    options: ConversationOptions = {},
    onTurnGenerated?: (segment: TranscriptSegment, turnNumber: number, total: number) => Promise<void>
): Promise<TranscriptSegment[]> {
    const turnCount = options.turnCount || 14;
    const conversation: TranscriptSegment[] = [];
    const history: string[] = [];

    // Initialize conversation context
    history.push(`Topic: ${topic}`);
    history.push(`Hosts: ${hosts.map(h => `${h.name} (${h.role})`).join(', ')}`);

    console.log('[ConversationalAI] Starting dynamic conversation:', {
        topic,
        hosts: hosts.map(h => h.name),
        turnCount
    });

    try {
        // Generate first turn
        const firstResponse = await supabase.functions.invoke('generate-turn', {
            body: {
                currentHost: hosts[0],
                otherHost: hosts[1] || hosts[0],
                topic,
                conversationHistory: history,
                options: {
                    ...options,
                    isFirstTurn: true
                }
            }
        });

        if (firstResponse.error) {
            throw new Error(`Edge Function error: ${firstResponse.error.message}`);
        }

        const firstText = firstResponse.data.text;

        const firstSegment: TranscriptSegment = {
            hostIndex: 0,
            hostName: hosts[0].name,
            text: firstText
        };

        conversation.push(firstSegment);
        history.push(`${hosts[0].name}: ${firstText}`);

        // Callback for streaming playback
        if (onTurnGenerated) {
            await onTurnGenerated(firstSegment, 1, turnCount);
        }

        // Generate remaining turns
        for (let turn = 1; turn < turnCount; turn++) {
            const currentHostIndex = turn % hosts.length;
            const currentHost = hosts[currentHostIndex];
            const otherHost = hosts[(turn + 1) % hosts.length];

            console.log(`[ConversationalAI] Generating turn ${turn + 1}/${turnCount} for ${currentHost.name}`);

            const text = await generateNextTurn(
                currentHost,
                otherHost,
                topic,
                history,
                options
            );

            const segment: TranscriptSegment = {
                hostIndex: currentHostIndex,
                hostName: currentHost.name,
                text: text
            };

            conversation.push(segment);
            history.push(`${currentHost.name}: ${text}`);

            // Callback for streaming playback
            if (onTurnGenerated) {
                await onTurnGenerated(segment, turn + 1, turnCount);
            }
        }

        console.log('[ConversationalAI] Conversation complete:', conversation.length, 'turns');
        return conversation;
    } catch (error) {
        console.error('[ConversationalAI] Error generating conversation:', error);
        throw error;
    }
}
