import { useState, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mic, MicOff, Radio, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function AgentPodcast() {
    const [agentId, setAgentId] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [mode, setMode] = useState<'listening' | 'speaking'>('listening');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const conversation = useConversation({
        onConnect: () => {
            setConnectionStatus('connected');
            setErrorMessage(null);
        },
        onDisconnect: () => {
            setConnectionStatus('disconnected');
            setMode('listening');
        },
        onModeChange: (modeProp) => {
            // Handle both direct string and object style if types are ambiguous
            const newMode = typeof modeProp === 'object' && 'mode' in modeProp ? modeProp.mode : modeProp;
            setMode(newMode as 'listening' | 'speaking');
        },
        onError: (error) => {
            console.error('Conversation error:', error);
            setErrorMessage(typeof error === 'string' ? error : 'An error occurred during the conversation');
            setConnectionStatus('disconnected');
        },
    });

    const startPodcast = async () => {
        if (!agentId) {
            setErrorMessage('Please enter a valid Agent ID');
            return;
        }

        setConnectionStatus('connecting');
        try {
            await conversation.startSession({
                agentId: agentId,
                connectionType: 'websocket',
            });
        } catch (error) {
            console.error('Failed to start session:', error);
            setErrorMessage('Failed to start session. Check console for details.');
            setConnectionStatus('disconnected');
        }
    };

    const stopPodcast = async () => {
        await conversation.endSession();
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Radio className={`w-5 h-5 ${connectionStatus === 'connected' ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
                        Agent Podcast
                    </CardTitle>
                    <CardDescription>
                        Enter your ElevenLabs Agent ID to start a single-stream multi-persona podcast.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="agentId">Agent ID</Label>
                        <Input
                            id="agentId"
                            placeholder="Ex: 29s38... (from ElevenLabs Dashboard)"
                            value={agentId}
                            onChange={(e) => setAgentId(e.target.value)}
                            disabled={connectionStatus !== 'disconnected'}
                        />
                    </div>

                    {errorMessage && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex items-center justify-center p-6 bg-secondary/20 rounded-lg">
                        {connectionStatus === 'connected' ? (
                            <div className="text-center space-y-2">
                                <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-colors ${mode === 'speaking' ? 'bg-primary/20' : 'bg-muted'}`}>
                                    {mode === 'speaking' ? (
                                        <Radio className="w-12 h-12 text-primary animate-pulse" />
                                    ) : (
                                        <Mic className="w-12 h-12 text-muted-foreground" />
                                    )}
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {mode === 'speaking' ? 'Agent is speaking...' : 'Listening to you...'}
                                </p>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <MicOff className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>Ready to connect</p>
                            </div>
                        )}
                    </div>

                </CardContent>
                <CardFooter>
                    {connectionStatus === 'disconnected' ? (
                        <Button className="w-full" onClick={startPodcast} disabled={!agentId}>
                            Start Podcast
                        </Button>
                    ) : (
                        <Button variant="destructive" className="w-full" onClick={stopPodcast}>
                            Stop Podcast
                        </Button>
                    )}
                </CardFooter>
            </Card>

            <div className="text-xs text-center text-muted-foreground">
                <p>Ensure your Agent is configured with the "Podcast Host" system prompt.</p>
            </div>
        </div>
    );
}
