import { useState, useEffect, useRef } from 'react';
import { useMultiVoiceTTS } from '@/hooks/useMultiVoiceTTS';
import { useConversation } from '@elevenlabs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Play, Square, Radio, Terminal } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Map placeholders to Real ElevenLabs Voice IDs
const HOST_VOICE_MAP: Record<string, string> = {
    '{{HOST_1_VOICE_ID}}': 'nPczCjzI2devNBz1zQrb', // Host 1 (Omar-ish)
    '{{HOST_2_VOICE_ID}}': 'JBFqnCBsd6RMkjVDRZzb', // Host 2 (Seb-ish)
    '{{HOST_1_NAME}}': 'Omar',
    '{{HOST_2_NAME}}': 'Seb',
};

const DEFAULT_SIMULATION_TEXT = ``; // Start empty as requested

export function MultiVoiceTTSDemo() {
    const [apiKey, setApiKey] = useState('');
    const [agentId, setAgentId] = useState('');
    const [simulationText, setSimulationText] = useState(DEFAULT_SIMULATION_TEXT);
    const [chatInput, setChatInput] = useState('');
    const [logs, setLogs] = useState<string[]>([]);

    // TTS Hook
    // TTS Hook
    const { handleStreamChunk, clearQueue, isPlaying, currentVoiceId, queue } = useMultiVoiceTTS({ apiKey });

    // Helper to replace placeholders
    const processIncomingText = (text: string): string => {
        let processed = text;
        Object.entries(HOST_VOICE_MAP).forEach(([placeholder, value]) => {
            // Replace all occurrences
            processed = processed.split(placeholder).join(value);
        });
        return processed;
    };

    // Real Agent Conversation Hook
    const conversation = useConversation({
        onConnect: () => addLog('Connected to Agent'),
        onDisconnect: () => addLog('Disconnected from Agent'),
        onMessage: (message: any) => {
            // Intercept message for TTS
            addLog(`Received RAW: ${JSON.stringify(message)}`);

            // Check if message contains the text stream we expect
            // The SDK structure varies, but usually message.message or message.text
            let textContent = message.message || message.text;

            if (textContent && typeof textContent === 'string') {
                // Pre-process to replace placeholders
                const processedText = processIncomingText(textContent);

                if (processedText !== textContent) {
                    addLog(`Processed placeholders in message`);
                }

                // 1. Play TTS
                handleStreamChunk(processedText);

                // 2. Append to Simulation Text (for debugging/replay)
                setSimulationText(prev => prev + processedText);
            } else if (typeof message === 'string') {
                const processedText = processIncomingText(message);
                handleStreamChunk(processedText);
                setSimulationText(prev => prev + processedText);
            }
        },
        onError: (err) => addLog(`Error: ${err}`),
    });

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 20));
    };

    const handleSimulate = async () => {
        addLog('Starting simulation...');
        clearQueue(); // Clear any previous

        // Simulate streaming char by char
        const chunks = simulationText.match(/.{1,10}/g) || []; // Send 10 chars at a time

        for (const chunk of chunks) {
            handleStreamChunk(chunk);
            await new Promise(r => setTimeout(r, 50)); // 50ms delay
        }
        addLog('Simulation stream ended.');
    };

    const handleConnect = async () => {
        if (!agentId) return;
        addLog('Note: ElevenLabs Conversational AI requires a signed URL or conversation token. Check the ElevenLabs dashboard for your agent configuration.');
    };

    const handleDisconnect = async () => {
        await conversation.endSession();
        clearQueue();
    };

    const handleSendMessage = () => {
        if (!chatInput.trim()) return;
        conversation.sendUserMessage(chatInput);
        addLog(`Sent: ${chatInput}`);
        setChatInput('');
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6 p-4">
            <Card>
                <CardHeader>
                    <CardTitle>Multi-Voice TTS Demo</CardTitle>
                    <CardDescription>Test the JSON-formatted multi-agent audio stream.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Configuration */}
                    <div className="grid gap-4 p-4 border rounded-lg bg-muted/50">
                        <div className="space-y-2">
                            <Label>ElevenLabs API Key (Required for TTS)</Label>
                            <Input
                                type="password"
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                placeholder="sk_..."
                            />
                            <p className="text-xs text-muted-foreground">This is client-side only for this demo.</p>
                        </div>
                    </div>

                    {/* Status Display Removed as requested */}
                    <div className="flex justify-end">
                        <Button variant="destructive" size="sm" onClick={clearQueue}>
                            Barge-In (Stop Audio)
                        </Button>
                    </div>

                    {/* Real Agent Mode */}
                    <div className="space-y-4 border p-4 rounded-lg">
                        <Label>Real Agent Connection</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Agent ID"
                                value={agentId}
                                onChange={e => setAgentId(e.target.value)}
                            />
                            <Button
                                variant={conversation.status === 'connected' ? "destructive" : "default"}
                                onClick={conversation.status === 'connected' ? handleDisconnect : handleConnect}
                            >
                                {conversation.status === 'connected' ? 'Disconnect' : 'Connect'}
                            </Button>
                        </div>

                        {/* Chat Input */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="Type a message to the agent..."
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                disabled={conversation.status !== 'connected'}
                            />
                            <Button
                                onClick={handleSendMessage}
                                disabled={conversation.status !== 'connected' || !chatInput.trim()}
                            >
                                Send
                            </Button>
                        </div>
                    </div>

                    {/* Queue Visualization */}
                    <div className="space-y-2 border rounded-lg p-4 bg-muted/20">
                        <div className="flex items-center justify-between mb-2">
                            <Label className="flex items-center gap-2">
                                <span className={isPlaying ? "text-green-500 animate-pulse" : ""}>●</span>
                                TTS Queue ({queue.length} items)
                            </Label>
                            <span className="text-xs text-muted-foreground font-mono">
                                {isPlaying ? `Playing: ${currentVoiceId}` : 'Idle'}
                            </span>
                        </div>

                        <div className="space-y-1 max-h-40 overflow-y-auto">
                            {queue.map((item, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs p-2 bg-background border rounded shadow-sm animate-in fade-in slide-in-from-right-2">
                                    <div className="min-w-[40px] font-bold text-primary/70">{item.voiceId.slice(0, 4)}..</div>
                                    <div className="flex-1 truncate" title={item.text}>{item.text}</div>
                                    {item.audioBuffer ? (
                                        <div className="w-2 h-2 rounded-full bg-blue-500" title="Buffer Ready" />
                                    ) : (
                                        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" title="Fetching..." />
                                    )}
                                </div>
                            ))}
                            {queue.length === 0 && (
                                <div className="text-xs text-muted-foreground text-center py-4 italic">
                                    Queue empty
                                </div>
                            )}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSimulate}
                            disabled={!apiKey || isPlaying}
                            className="w-full mt-2"
                        >
                            <Play className="w-4 h-4 mr-2" /> Simulate Stream (Replay Received)
                        </Button>
                    </div>

                    {/* Logs */}
                    <div className="bg-black/90 text-green-400 p-4 rounded-lg font-mono text-xs h-40 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-2 border-b border-green-900/50 pb-2">
                            <Terminal className="w-4 h-4" />
                            <span>Message Log (Raw Stream)</span>
                        </div>
                        {logs.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
