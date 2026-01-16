/**
 * Interactive Podcast View
 * Enables real-time voice interaction with podcast hosts using ElevenLabs Conversational AI
 */

import { useEffect, useState, useRef } from 'react';
import { Conversation } from '@elevenlabs/client';
import { HostConfig } from '@/types/podcast';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Pause, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InteractivePodcastViewProps {
    hosts: HostConfig[];
    topic: string;
    ragContext?: string;
    onClose: () => void;
}

interface Message {
    role: 'agent' | 'user';
    host?: string;
    text: string;
    timestamp: Date;
}

const ELEVENLABS_AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID;

export function InteractivePodcastView({
    hosts,
    topic,
    ragContext,
    onClose
}: InteractivePodcastViewProps) {
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isUserSpeaking, setIsUserSpeaking] = useState(false);
    const [activeHost, setActiveHost] = useState<string>('');
    const [transcript, setTranscript] = useState<Message[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const conversationRef = useRef<Conversation | null>(null);

    useEffect(() => {
        initializeConversation();

        return () => {
            // Cleanup on unmount
            if (conversationRef.current) {
                conversationRef.current.endSession();
            }
        };
    }, []);

    const initializeConversation = async () => {
        try {
            console.log('[InteractivePodcast] Initializing conversation...');

            if (!ELEVENLABS_AGENT_ID) {
                throw new Error('VITE_ELEVENLABS_AGENT_ID is not configured');
            }

            // Build system prompt with multi-host personality
            const systemPrompt = `You are hosting an interactive podcast about "${topic}" with two distinct personalities:

Host 1 - ${hosts[0]?.name || 'Alex'} (${hosts[0]?.role || 'Technical Expert'}):
${hosts[0]?.personality || 'Analytical and precise, explains complex concepts clearly'}

Host 2 - ${hosts[1]?.name || 'Emma'} (${hosts[1]?.role || 'Curious Learner'}):
${hosts[1]?.personality || 'Asks clarifying questions, relates concepts to real-world examples'}

${ragContext ? `\n\nReference Material:\n${ragContext}\n` : ''}

IMPORTANT RULES:
1. Start each response with the host name in brackets: [${hosts[0]?.name || 'Alex'}] or [${hosts[1]?.name || 'Emma'}]
2. Alternate between hosts naturally in the conversation
3. When the user asks a question, the most relevant host responds
4. Keep responses to 2-3 sentences maximum
5. Be conversational, engaging, and build on previous points
6. If the user interrupts, acknowledge their question and respond directly

Example:
[${hosts[0]?.name || 'Alex'}] Let's dive into ${topic}. This is a fascinating area.
[${hosts[1]?.name || 'Jordan'}] Absolutely! Can you break down the key concepts for our listeners?`;

            const conv = await Conversation.startSession({
                agentId: ELEVENLABS_AGENT_ID,

                overrides: {
                    agent: {
                        prompt: {
                            prompt: systemPrompt
                        }
                    }
                },

                onConnect: () => {
                    console.log('[InteractivePodcast] Connected to ElevenLabs');
                    setIsConnected(true);

                    // Start the conversation
                    conv.sendText(`Start the podcast. ${hosts[0]?.name || 'Alex'} introduces the topic "${topic}".`);
                },

                onMessage: (message) => {
                    console.log('[InteractivePodcast] Agent message:', message);

                    // Extract host name from message
                    const match = message.message.match(/^\[(\w+)\]\s*(.+)$/s);
                    const hostName = match ? match[1] : hosts[0]?.name || 'Host';
                    const text = match ? match[2] : message.message;

                    setActiveHost(hostName);
                    setTranscript(prev => [...prev, {
                        role: 'agent',
                        host: hostName,
                        text: text.trim(),
                        timestamp: new Date()
                    }]);
                },

                onUserTranscript: (userTranscript) => {
                    console.log('[InteractivePodcast] User transcript:', userTranscript);

                    setTranscript(prev => [...prev, {
                        role: 'user',
                        text: userTranscript,
                        timestamp: new Date()
                    }]);
                },

                onModeChange: (mode) => {
                    console.log('[InteractivePodcast] Mode change:', mode);
                    setIsUserSpeaking(mode.mode === 'speaking');
                },

                onDisconnect: () => {
                    console.log('[InteractivePodcast] Disconnected');
                    setIsConnected(false);
                },

                onError: (error) => {
                    console.error('[InteractivePodcast] Error:', error);
                    setError(error.message || 'An error occurred');
                }
            });

            setConversation(conv);
            conversationRef.current = conv;
        } catch (err) {
            console.error('[InteractivePodcast] Failed to initialize:', err);
            setError(err instanceof Error ? err.message : 'Failed to initialize conversation');
        }
    };

    const handleAskQuestion = () => {
        if (!conversation) return;

        setIsListening(true);
        // The SDK handles microphone access automatically
    };

    const handleStopListening = () => {
        setIsListening(false);
    };

    const handlePauseResume = () => {
        if (isPaused) {
            // Resume
            conversation?.sendText('Continue the conversation.');
            setIsPaused(false);
        } else {
            // Pause
            setIsPaused(true);
        }
    };

    const handleEndPodcast = () => {
        conversation?.endSession();
        onClose();
    };

    // Get host avatar and info
    const getHostInfo = (hostName: string) => {
        return hosts.find(h => h.name === hostName) || hosts[0];
    };

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-8">
                <div className="max-w-md text-center space-y-4">
                    <h2 className="text-2xl font-bold text-destructive">Error</h2>
                    <p className="text-muted-foreground">{error}</p>
                    <Button onClick={onClose}>Close</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Interactive Podcast</h1>
                    <p className="text-sm text-muted-foreground">{topic}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleEndPodcast}>
                    <X className="h-5 w-5" />
                </Button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6">
                {/* Left: Host Avatars */}
                <div className="lg:w-1/3 space-y-4">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Podcast Hosts</div>
                    {hosts.map((host) => {
                        const isActive = activeHost === host.name;
                        const isSpeaking = isActive && !isUserSpeaking;

                        return (
                            <div
                                key={host.id}
                                className={cn(
                                    'p-4 rounded-lg border-2 transition-all',
                                    isSpeaking && 'border-primary bg-primary/5 scale-105',
                                    !isSpeaking && 'border-border'
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <img
                                        src={host.avatarUrl}
                                        alt={host.name}
                                        className={cn(
                                            'w-12 h-12 rounded-full',
                                            isSpeaking && 'ring-4 ring-primary'
                                        )}
                                    />
                                    <div className="flex-1">
                                        <div className="font-semibold">{host.name}</div>
                                        <div className="text-sm text-muted-foreground">{host.role}</div>
                                    </div>
                                    {isSpeaking && (
                                        <div className="flex gap-1">
                                            <div className="w-1 h-4 bg-primary animate-pulse" />
                                            <div className="w-1 h-4 bg-primary animate-pulse delay-75" />
                                            <div className="w-1 h-4 bg-primary animate-pulse delay-150" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* User Speaking Indicator */}
                    {isUserSpeaking && (
                        <div className="p-4 rounded-lg border-2 border-green-500 bg-green-500/5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <Mic className="w-6 h-6 text-green-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold">You</div>
                                    <div className="text-sm text-muted-foreground">Speaking...</div>
                                </div>
                                <div className="flex gap-1">
                                    <div className="w-1 h-4 bg-green-500 animate-pulse" />
                                    <div className="w-1 h-4 bg-green-500 animate-pulse delay-75" />
                                    <div className="w-1 h-4 bg-green-500 animate-pulse delay-150" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Transcript */}
                <div className="lg:w-2/3 flex flex-col">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Conversation</div>
                    <div className="flex-1 bg-card rounded-lg border p-4 overflow-y-auto space-y-4">
                        {!isConnected && (
                            <div className="text-center text-muted-foreground py-8">
                                Connecting to podcast...
                            </div>
                        )}

                        {transcript.map((msg, i) => (
                            <div
                                key={i}
                                className={cn(
                                    'p-3 rounded-lg',
                                    msg.role === 'agent' && 'bg-primary/5',
                                    msg.role === 'user' && 'bg-green-500/5 ml-8'
                                )}
                            >
                                <div className="flex items-start gap-2">
                                    {msg.role === 'agent' && msg.host && (
                                        <img
                                            src={getHostInfo(msg.host).avatarUrl}
                                            alt={msg.host}
                                            className="w-8 h-8 rounded-full"
                                        />
                                    )}
                                    {msg.role === 'user' && (
                                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                            <Mic className="w-4 h-4 text-green-500" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <div className="font-semibold text-sm">
                                            {msg.role === 'agent' ? msg.host : 'You'}
                                        </div>
                                        <div className="text-sm mt-1">{msg.text}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="p-6 border-t bg-card">
                <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
                    <Button
                        size="lg"
                        variant={isListening ? 'destructive' : 'default'}
                        onClick={isListening ? handleStopListening : handleAskQuestion}
                        disabled={!isConnected || isPaused}
                    >
                        {isListening ? (
                            <>
                                <MicOff className="w-5 h-5 mr-2" />
                                Stop Speaking
                            </>
                        ) : (
                            <>
                                <Mic className="w-5 h-5 mr-2" />
                                Ask Question
                            </>
                        )}
                    </Button>

                    <Button
                        size="lg"
                        variant="outline"
                        onClick={handlePauseResume}
                        disabled={!isConnected}
                    >
                        {isPaused ? (
                            <>
                                <Play className="w-5 h-5 mr-2" />
                                Resume
                            </>
                        ) : (
                            <>
                                <Pause className="w-5 h-5 mr-2" />
                                Pause
                            </>
                        )}
                    </Button>

                    <Button
                        size="lg"
                        variant="outline"
                        onClick={handleEndPodcast}
                    >
                        <X className="w-5 h-5 mr-2" />
                        End Podcast
                    </Button>
                </div>
            </div>
        </div>
    );
}
