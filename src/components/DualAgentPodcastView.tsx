/**
 * Dual-Agent Podcast View
 * UI for two-agent sequential conversation with user interruptability
 * Uses user-configured host personalities
 */

import { useEffect, useState, useRef } from 'react';
import { ConversationOrchestrator, Message } from '@/lib/ConversationOrchestrator';
import { HostConfig } from '@/types/podcast';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, X, Pause, Play, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface DualAgentPodcastViewProps {
    hosts: HostConfig[];
    topic: string;
    ragContext?: string;
    onClose: () => void;
}

const AGENT_A_ID = import.meta.env.VITE_ELEVENLABS_AGENT_A_ID;
const AGENT_B_ID = import.meta.env.VITE_ELEVENLABS_AGENT_B_ID;

export function DualAgentPodcastView({
    hosts,
    topic,
    ragContext,
    onClose
}: DualAgentPodcastViewProps) {
    const [orchestrator, setOrchestrator] = useState<ConversationOrchestrator | null>(null);
    const [currentSpeakerIndex, setCurrentSpeakerIndex] = useState<number>(0);
    const [transcript, setTranscript] = useState<Message[]>([]);
    const [isUserInputActive, setIsUserInputActive] = useState(false);
    const [userQuestion, setUserQuestion] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState(false);

    const orchestratorRef = useRef<ConversationOrchestrator | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    // Get host configs (use first two hosts from user selection)
    const hostA = hosts[0] || {
        id: 'default-a',
        name: 'Host A',
        voiceId: '',
        voiceLabel: '',
        role: 'Technical Expert',
        personality: 'Analytical and precise, explains concepts clearly'
    };

    const hostB = hosts[1] || {
        id: 'default-b',
        name: 'Host B',
        voiceId: '',
        voiceLabel: '',
        role: 'Curious Learner',
        personality: 'Enthusiastic and inquisitive, asks great questions'
    };

    useEffect(() => {
        initializeOrchestrator();

        return () => {
            if (orchestratorRef.current) {
                orchestratorRef.current.endSession();
            }
        };
    }, []);

    // Auto-scroll transcript
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    const initializeOrchestrator = async () => {
        try {
            console.log('[DualAgentView] Initializing with custom hosts:', {
                hostA: { name: hostA.name, role: hostA.role },
                hostB: { name: hostB.name, role: hostB.role }
            });

            if (!AGENT_A_ID || !AGENT_B_ID) {
                throw new Error('Agent IDs not configured. Please set VITE_ELEVENLABS_AGENT_A_ID and VITE_ELEVENLABS_AGENT_B_ID in .env');
            }

            const orch = new ConversationOrchestrator({
                onMessage: (speaker, text, hostIndex) => {
                    console.log(`[DualAgentView] Message from ${speaker}:`, text);
                    setTranscript(prev => [...prev, {
                        speaker,
                        text,
                        timestamp: new Date(),
                        hostIndex
                    }]);
                },

                onSpeakerChange: (speaker, hostIndex) => {
                    console.log(`[DualAgentView] Speaker changed to index:`, hostIndex);
                    setCurrentSpeakerIndex(hostIndex);
                },

                onError: (errorMsg) => {
                    console.error('[DualAgentView] Error:', errorMsg);
                    setError(errorMsg);
                },

                onConnected: () => {
                    console.log('[DualAgentView] Connected!');
                    setIsConnected(true);
                }
            });

            // Initialize with user-configured hosts
            await orch.initialize({
                agentAId: AGENT_A_ID,
                agentBId: AGENT_B_ID,
                hostA: hostA,
                hostB: hostB,
                topic: topic,
                ragContext: ragContext
            });

            setOrchestrator(orch);
            orchestratorRef.current = orch;

            console.log('[DualAgentView] Orchestrator initialized successfully');
        } catch (err) {
            console.error('[DualAgentView] Initialization failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to initialize conversation');
        }
    };

    const handleAskQuestion = () => {
        setIsUserInputActive(true);
    };

    const handleCancelQuestion = () => {
        setIsUserInputActive(false);
        setUserQuestion('');
    };

    const handleSubmitQuestion = async () => {
        if (!orchestrator || !userQuestion.trim()) return;

        console.log('[DualAgentView] User asks:', userQuestion);

        // Add user message to transcript
        setTranscript(prev => [...prev, {
            speaker: 'You',
            text: userQuestion,
            timestamp: new Date()
        }]);

        const question = userQuestion;
        setUserQuestion('');
        setIsUserInputActive(false);

        // Send to orchestrator
        await orchestrator.handleUserInterrupt(question);
    };

    const handleEndPodcast = async () => {
        if (orchestrator) {
            await orchestrator.endSession();
        }
        onClose();
    };

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-8">
                <div className="max-w-md text-center space-y-4">
                    <h2 className="text-2xl font-bold text-destructive">Error</h2>
                    <p className="text-muted-foreground">{error}</p>
                    <div className="space-y-2 text-sm text-left bg-muted p-4 rounded">
                        <p><strong>Setup Required:</strong></p>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Create two agents on ElevenLabs</li>
                            <li>Add agent IDs to .env file</li>
                            <li>Restart dev server</li>
                        </ol>
                    </div>
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

                    {/* Host A */}
                    <div
                        className={cn(
                            'p-4 rounded-lg border-2 transition-all duration-300',
                            currentSpeakerIndex === 0 && 'border-primary bg-primary/5 scale-[1.02]',
                            currentSpeakerIndex !== 0 && 'border-border opacity-60'
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <img
                                src={hostA.avatarUrl || '/placeholder-avatar.png'}
                                alt={hostA.name}
                                className={cn(
                                    'w-14 h-14 rounded-full object-cover',
                                    currentSpeakerIndex === 0 && 'ring-4 ring-primary'
                                )}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold truncate">{hostA.name}</div>
                                <div className="text-sm text-muted-foreground truncate">{hostA.role}</div>
                                {hostA.personality && (
                                    <div className="text-xs text-muted-foreground/70 truncate mt-0.5">
                                        {hostA.personality.substring(0, 40)}...
                                    </div>
                                )}
                            </div>
                            {currentSpeakerIndex === 0 && (
                                <div className="flex gap-0.5">
                                    <div className="w-1 h-4 bg-primary rounded animate-pulse" />
                                    <div className="w-1 h-4 bg-primary rounded animate-pulse delay-75" />
                                    <div className="w-1 h-4 bg-primary rounded animate-pulse delay-150" />
                                </div>
                            )}
                            {currentSpeakerIndex === 1 && (
                                <div className="text-xs text-muted-foreground">Listening</div>
                            )}
                        </div>
                    </div>

                    {/* Host B */}
                    <div
                        className={cn(
                            'p-4 rounded-lg border-2 transition-all duration-300',
                            currentSpeakerIndex === 1 && 'border-primary bg-primary/5 scale-[1.02]',
                            currentSpeakerIndex !== 1 && 'border-border opacity-60'
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <img
                                src={hostB.avatarUrl || '/placeholder-avatar.png'}
                                alt={hostB.name}
                                className={cn(
                                    'w-14 h-14 rounded-full object-cover',
                                    currentSpeakerIndex === 1 && 'ring-4 ring-primary'
                                )}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold truncate">{hostB.name}</div>
                                <div className="text-sm text-muted-foreground truncate">{hostB.role}</div>
                                {hostB.personality && (
                                    <div className="text-xs text-muted-foreground/70 truncate mt-0.5">
                                        {hostB.personality.substring(0, 40)}...
                                    </div>
                                )}
                            </div>
                            {currentSpeakerIndex === 1 && (
                                <div className="flex gap-0.5">
                                    <div className="w-1 h-4 bg-primary rounded animate-pulse" />
                                    <div className="w-1 h-4 bg-primary rounded animate-pulse delay-75" />
                                    <div className="w-1 h-4 bg-primary rounded animate-pulse delay-150" />
                                </div>
                            )}
                            {currentSpeakerIndex === 0 && (
                                <div className="text-xs text-muted-foreground">Listening</div>
                            )}
                        </div>
                    </div>

                    {/* Connection Status */}
                    {!isConnected && (
                        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                                <span className="text-sm text-yellow-600 dark:text-yellow-400">
                                    Connecting to agents...
                                </span>
                            </div>
                        </div>
                    )}

                    {isConnected && (
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="text-sm text-green-600 dark:text-green-400">
                                    Live Conversation
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Transcript */}
                <div className="lg:w-2/3 flex flex-col">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Conversation</div>
                    <div className="flex-1 bg-card rounded-lg border p-4 overflow-y-auto space-y-4 max-h-[600px]">
                        {transcript.length === 0 && (
                            <div className="text-center text-muted-foreground py-8">
                                {isConnected ? 'Starting conversation...' : 'Connecting to hosts...'}
                            </div>
                        )}

                        {transcript.map((msg, i) => {
                            const isUser = msg.speaker === 'You';
                            const host = msg.hostIndex === 0 ? hostA : hostB;

                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        'p-3 rounded-lg',
                                        !isUser && 'bg-primary/5',
                                        isUser && 'bg-green-500/10 ml-8'
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        {!isUser && (
                                            <img
                                                src={host.avatarUrl || '/placeholder-avatar.png'}
                                                alt={msg.speaker}
                                                className="w-8 h-8 rounded-full object-cover"
                                            />
                                        )}
                                        {isUser && (
                                            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                                <Mic className="w-4 h-4 text-green-500" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div className="font-semibold text-sm flex items-center gap-2">
                                                {msg.speaker}
                                                {!isUser && (
                                                    <span className="text-xs font-normal text-muted-foreground">
                                                        ({host.role})
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm mt-1">{msg.text}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={transcriptEndRef} />
                    </div>

                    {/* User Input */}
                    {isUserInputActive && (
                        <div className="mt-4">
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    placeholder="Type your question..."
                                    value={userQuestion}
                                    onChange={(e) => setUserQuestion(e.target.value)}
                                    className="flex-1"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && userQuestion.trim()) {
                                            handleSubmitQuestion();
                                        }
                                        if (e.key === 'Escape') {
                                            handleCancelQuestion();
                                        }
                                    }}
                                />
                                <Button onClick={handleSubmitQuestion} disabled={!userQuestion.trim()}>
                                    <Send className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" onClick={handleCancelQuestion}>
                                    Cancel
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Press Enter to send, Escape to cancel
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="p-6 border-t bg-card">
                <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
                    <Button
                        size="lg"
                        variant={isUserInputActive ? 'secondary' : 'default'}
                        onClick={isUserInputActive ? handleCancelQuestion : handleAskQuestion}
                        disabled={!isConnected}
                    >
                        {isUserInputActive ? (
                            <>
                                <MicOff className="w-5 h-5 mr-2" />
                                Cancel
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
