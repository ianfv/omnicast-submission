/**
 * Conversation Orchestrator
 * Manages turn-taking and coordination between two ElevenLabs agents
 * Uses user-configured host personalities for customization
 */

import { Conversation } from '@elevenlabs/client';
import { HostConfig } from '@/types/podcast';

export interface Message {
    speaker: string;
    text: string;
    timestamp: Date;
    hostIndex?: number;
}

export interface OrchestratorCallbacks {
    onMessage: (speaker: string, text: string, hostIndex: number) => void;
    onSpeakerChange: (speaker: 'A' | 'B', hostIndex: number) => void;
    onError: (error: string) => void;
    onConnected?: () => void;
}

export interface OrchestratorConfig {
    agentAId: string;
    agentBId: string;
    hostA: HostConfig;
    hostB: HostConfig;
    topic: string;
    ragContext?: string;
}

export class ConversationOrchestrator {
    private agentA: Conversation | null = null;
    private agentB: Conversation | null = null;
    private currentSpeaker: 'A' | 'B' = 'A';
    private conversationHistory: Message[] = [];
    private isInterrupted: boolean = false;
    private callbacks: OrchestratorCallbacks;
    private hostA: HostConfig;
    private hostB: HostConfig;
    private topic: string = '';
    private ragContext: string = '';

    constructor(callbacks: OrchestratorCallbacks) {
        this.callbacks = callbacks;
        this.hostA = { id: '', name: 'Host A', voiceId: '', voiceLabel: '', role: 'Host' };
        this.hostB = { id: '', name: 'Host B', voiceId: '', voiceLabel: '', role: 'Host' };
    }

    /**
     * Initialize both agents with user-configured personalities
     */
    async initialize(config: OrchestratorConfig) {
        this.hostA = config.hostA;
        this.hostB = config.hostB;
        this.topic = config.topic;
        this.ragContext = config.ragContext || '';

        console.log('[Orchestrator] Initializing with custom hosts:', {
            hostA: { name: this.hostA.name, role: this.hostA.role },
            hostB: { name: this.hostB.name, role: this.hostB.role },
            topic: this.topic
        });

        try {
            // Initialize Agent A with user-configured personality
            this.agentA = await this.createAgent(
                config.agentAId,
                this.hostA,
                this.hostB,
                'A'
            );

            // Initialize Agent B with user-configured personality
            this.agentB = await this.createAgent(
                config.agentBId,
                this.hostB,
                this.hostA,
                'B'
            );

            console.log('[Orchestrator] Both agents initialized');
            this.callbacks.onConnected?.();

            // Start the conversation
            await this.startConversation();
        } catch (error) {
            console.error('[Orchestrator] Initialization error:', error);
            this.callbacks.onError(error instanceof Error ? error.message : 'Failed to initialize agents');
            throw error;
        }
    }

    /**
     * Create and configure an agent with user-selected personality
     */
    private async createAgent(
        agentId: string,
        host: HostConfig,
        otherHost: HostConfig,
        agentKey: 'A' | 'B'
    ): Promise<Conversation> {
        // Build personalized system prompt based on user configuration
        const systemPrompt = this.buildSystemPrompt(host, otherHost);

        console.log(`[Orchestrator] Creating agent for ${host.name}:`, {
            role: host.role,
            personality: host.personality?.substring(0, 50) + '...'
        });

        return await Conversation.startSession({
            agentId,

            overrides: {
                agent: {
                    prompt: {
                        prompt: systemPrompt
                    }
                }
            },

            onConnect: () => {
                console.log(`[Orchestrator] Agent ${host.name} connected`);
            },

            onMessage: (message) => {
                const hostIndex = agentKey === 'A' ? 0 : 1;
                this.handleAgentMessage(host.name, message, agentKey, hostIndex);
            },

            onDisconnect: () => {
                console.log(`[Orchestrator] Agent ${host.name} disconnected`);
            },

            onError: (error) => {
                console.error(`[Orchestrator] Agent ${host.name} error:`, error);
                this.callbacks.onError(`${host.name}: ${error.message || 'Unknown error'}`);
            }
        });
    }

    /**
     * Build personalized system prompt from user configuration
     */
    private buildSystemPrompt(host: HostConfig, otherHost: HostConfig): string {
        const personality = host.personality || 'Engaging and knowledgeable';
        const role = host.role || 'Podcast Host';
        const otherRole = otherHost.role || 'Podcast Host';

        return `You are ${host.name}, ${role} in a podcast conversation about "${this.topic}".

YOUR PERSONALITY:
${personality}

YOUR CO-HOST:
You are having a natural conversation with ${otherHost.name}, who is ${otherRole}.

${this.ragContext ? `REFERENCE MATERIAL:\n${this.ragContext}\n` : ''}

CRITICAL RULES:
1. Keep responses to 2-3 sentences maximum
2. Be conversational and natural - this is a dialogue, not a monologue
3. Build on what ${otherHost.name} says
4. Stay in character as ${host.name}
5. Match your personality: ${personality}
6. Listen to your co-host and respond directly to their points

Remember: You are ${host.name}. React naturally to what ${otherHost.name} says.`;
    }

    /**
     * Start the conversation with an initial prompt
     */
    private async startConversation() {
        console.log('[Orchestrator] Starting conversation about:', this.topic);

        const initialPrompt = `Start a podcast conversation about "${this.topic}". 
    
You are ${this.hostA.name}.
Your co-host is ${this.hostB.name}.

Introduce the topic in an engaging way that matches your personality: ${this.hostA.personality || 'engaging and knowledgeable'}.
Keep it to 2-3 sentences.`;

        // Agent A starts
        await this.agentA?.sendText(initialPrompt);
        this.currentSpeaker = 'A';
        this.callbacks.onSpeakerChange('A', 0);
    }

    /**
     * Handle message from an agent
     */
    private async handleAgentMessage(
        speaker: string,
        message: string,
        agentKey: 'A' | 'B',
        hostIndex: number
    ) {
        console.log(`[Orchestrator] ${speaker} says:`, message);

        // Add to history
        this.conversationHistory.push({
            speaker,
            text: message,
            timestamp: new Date(),
            hostIndex
        });

        // Notify UI
        this.callbacks.onMessage(speaker, message, hostIndex);

        // Don't pass to next agent if interrupted
        if (this.isInterrupted) {
            console.log('[Orchestrator] Conversation interrupted, not passing turn');
            return;
        }

        // Pass to other agent
        if (agentKey === 'A') {
            await this.passToAgentB(message);
        } else {
            await this.passToAgentA(message);
        }
    }

    /**
     * Pass conversation to Agent B (Host B)
     */
    private async passToAgentB(messageFromA: string) {
        const context = this.buildContext(3);

        const prompt = `${this.hostA.name} just said: "${messageFromA}"

Recent conversation:
${context}

Respond naturally as ${this.hostB.name} (${this.hostB.role}).
Match your personality: ${this.hostB.personality || 'engaging and curious'}
Keep it to 2-3 sentences.`;

        console.log('[Orchestrator] Passing to', this.hostB.name);
        await this.agentB?.sendText(prompt);

        this.currentSpeaker = 'B';
        this.callbacks.onSpeakerChange('B', 1);
    }

    /**
     * Pass conversation to Agent A (Host A)
     */
    private async passToAgentA(messageFromB: string) {
        const context = this.buildContext(3);

        const prompt = `${this.hostB.name} just said: "${messageFromB}"

Recent conversation:
${context}

Respond naturally as ${this.hostA.name} (${this.hostA.role}).
Match your personality: ${this.hostA.personality || 'analytical and precise'}
Keep it to 2-3 sentences.`;

        console.log('[Orchestrator] Passing to', this.hostA.name);
        await this.agentA?.sendText(prompt);

        this.currentSpeaker = 'A';
        this.callbacks.onSpeakerChange('A', 0);
    }

    /**
     * Handle user interruption with smooth transition
     */
    async handleUserInterrupt(userQuestion: string) {
        console.log('[Orchestrator] User interrupts with:', userQuestion);

        this.isInterrupted = true;

        // Build transition context
        const recentContext = this.conversationHistory.slice(-3);
        const contextText = recentContext
            .map(m => `${m.speaker}: ${m.text}`)
            .join('\n');

        const currentHost = this.currentSpeaker === 'A' ? this.hostA : this.hostB;
        const otherHost = this.currentSpeaker === 'A' ? this.hostB : this.hostA;

        const transitionPrompt = `We were just discussing:
${contextText}

The listener just asked: "${userQuestion}"

You are ${currentHost.name} (${currentHost.role}).
Acknowledge their question and smoothly transition to this topic.
Reference what we just discussed to make the transition seamless.
Stay in character with your personality: ${currentHost.personality || 'engaging'}

Keep your response to 2-3 sentences.`;

        // Send to current speaker
        const currentAgent = this.currentSpeaker === 'A' ? this.agentA : this.agentB;

        console.log(`[Orchestrator] Sending transition to ${currentHost.name}`);
        await currentAgent?.sendText(transitionPrompt);

        // Resume normal flow after response
        setTimeout(() => {
            this.isInterrupted = false;
            console.log('[Orchestrator] Resuming normal conversation flow');
        }, 1000);
    }

    /**
     * Build context string from recent conversation
     */
    private buildContext(numMessages: number = 5): string {
        return this.conversationHistory
            .slice(-numMessages)
            .map(m => `${m.speaker}: ${m.text}`)
            .join('\n');
    }

    /**
     * Get conversation history
     */
    getHistory(): Message[] {
        return [...this.conversationHistory];
    }

    /**
     * Get current speaker
     */
    getCurrentSpeaker(): 'A' | 'B' {
        return this.currentSpeaker;
    }

    /**
     * Get host configurations
     */
    getHosts(): { hostA: HostConfig; hostB: HostConfig } {
        return { hostA: this.hostA, hostB: this.hostB };
    }

    /**
     * End both agent sessions
     */
    async endSession() {
        console.log('[Orchestrator] Ending conversation');

        try {
            await this.agentA?.endSession();
            await this.agentB?.endSession();
        } catch (error) {
            console.error('[Orchestrator] Error ending sessions:', error);
        }
    }
}
