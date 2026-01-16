/**
 * RealTimePlaybackView - Visual Podcast Playback Component
 * 
 * Displays podcast hosts with visual feedback during playback.
 * Uses Backboard.io for infinite streaming conversations and ElevenLabs for TTS.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { HostConfig, ConversationState, RagFile } from '@/types/podcast';
import { Button } from '@/components/ui/button';
import { X, Volume2, VolumeX, Play, Pause, SkipForward, Loader2, MessageSquare, Send, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  initializeSession,
  handleInterruption,
  endSession,
  generateNextTurn, // Fallback if streaming fails
} from '@/lib/backboard';
import { startSpeakingChain, speakTurn, SpeakingChainResult } from '@/lib/streamCoordinator';
import { streamAudioToElement } from '@/lib/audioStream';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import Lottie from 'lottie-react';
import girl1 from '@/components/avatarslottie/girl1.json';
import male1 from '@/components/avatarslottie/male1.json';
import male2 from '@/components/avatarslottie/male2.json';

export interface RealTimePlaybackViewProps {
  hosts: HostConfig[];
  topic?: string;
  podcastId: string;
  userId?: string;
  ragFiles?: RagFile[];
  classroomDocuments?: {
    name: string;
    content: string;
  }[];
  preGeneratedTranscript?: TranscriptSegment[];
  onClose: () => void;
}

interface TranscriptSegment {
  hostIndex: number;
  hostName: string;
  text: string;
  timestamp: number;
}

const HOST_COLORS = ['hsl(var(--host-a))', 'hsl(var(--host-b))', 'hsl(var(--host-c))'];

// Expression to visual mapping
const EXPRESSION_STYLES: Record<string, {
  scale: number;
  filter: string;
}> = {
  neutral: { scale: 1, filter: 'none' },
  excited: { scale: 1.05, filter: 'brightness(1.1) saturate(1.2)' },
  thoughtful: { scale: 0.98, filter: 'brightness(0.95)' },
  skeptical: { scale: 1, filter: 'hue-rotate(-10deg)' },
  amused: { scale: 1.02, filter: 'brightness(1.05) saturate(1.1)' }
};

// Floating dust particles for ambient effect
function DustParticles() {
  const particles = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * -20,
    opacity: Math.random() * 0.3 + 0.1
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white/20 animate-dust-float"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`
          }}
        />
      ))}
    </div>
  );
}

// Studio spotlight behind each avatar
function StudioSpotlight({
  isActive,
  color,
  position
}: {
  isActive: boolean;
  color: string;
  position: 'left' | 'center' | 'right';
}) {
  const positionClasses = {
    left: '-translate-x-1/4',
    center: '',
    right: 'translate-x-1/4'
  };

  return (
    <div
      className={cn(
        "absolute -bottom-20 left-1/2 -translate-x-1/2 w-80 h-96",
        "transition-all duration-1000 ease-out",
        positionClasses[position],
        isActive ? "opacity-100" : "opacity-20"
      )}
      style={{
        background: `radial-gradient(ellipse at bottom, ${color}30 0%, ${color}10 30%, transparent 70%)`,
        filter: isActive ? 'blur(40px)' : 'blur(60px)',
        transform: `translateX(-50%) ${isActive ? 'scale(1.2)' : 'scale(0.8)'}`
      }}
    />
  );
}

function CinematicAvatar({
  host,
  isActive,
  hostIndex,
  totalHosts,
  state
}: {
  host: HostConfig;
  isActive: boolean;
  hostIndex: number;
  totalHosts: number;
  state: ConversationState;
}) {
  const lottieRef = useRef<any>(null);
  const hostColor = HOST_COLORS[hostIndex] || HOST_COLORS[0];

  // Get avatar based on host index (max 3 hosts)
  const getAvatarData = (index: number) => {
    const avatars = [male1, girl1, male2];
    return avatars[index % 3];
  };

  const avatarData = getAvatarData(hostIndex);

  const spotlightPosition = hostIndex === 0 ? 'left' : hostIndex === totalHosts - 1 ? 'right' : 'center';
  const isSpeaking = state === 'SPEAKING' && isActive;

  // Control Lottie playback based on speaking state
  useEffect(() => {
    if (lottieRef.current) {
      if (isSpeaking) {
        lottieRef.current.play();
      } else {
        lottieRef.current.stop();
      }
    }
  }, [isSpeaking]);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center transition-all duration-700 ease-out",
        isActive ? "z-20" : "z-10"
      )}
      style={{
        transform: `scale(${isActive ? 1.1 : 0.9})`,
        opacity: isActive ? 1 : 0.6
      }}
    >
      <StudioSpotlight isActive={isSpeaking} color={hostColor} position={spotlightPosition} />

      <div className="relative">
        <div
          className={cn(
            "w-48 h-48 md:w-64 md:h-64 relative",
            "transition-all duration-700",
            isSpeaking && "animate-float-gentle"
          )}
        >
          <Lottie
            lottieRef={lottieRef}
            animationData={avatarData}
            loop={true}
            autoplay={false}
            style={{
              width: '100%',
              height: '100%'
            }}
          />
        </div>
      </div>

      <div
        className={cn(
          "mt-8 px-6 py-2 transition-all duration-700",
          "text-sm md:text-base font-medium",
          isActive
            ? "text-white/95"
            : "text-white/30"
        )}
        style={{
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontWeight: isActive ? 600 : 500,
          textShadow: isActive
            ? '0 2px 8px rgba(0,0,0,0.8), 0 0 1px rgba(255,255,255,0.3)'
            : '0 1px 4px rgba(0,0,0,0.5)'
        }}
      >
        {host.name}
      </div>
    </div>
  );
}

function StateIndicator({ state, isPausable }: { state: ConversationState; isPausable?: boolean }) {
  const stateConfig = {
    IDLE: { label: 'Connecting...', color: 'text-muted-foreground' },
    LISTENING: { label: 'Interruption...', color: 'text-yellow-400' },
    THINKING: { label: 'Thinking...', color: 'text-cyan-400' },
    SPEAKING: { label: isPausable ? 'Playing' : 'Initializing...', color: 'text-green-400' }
  };

  const config = stateConfig[state];

  return (
    <div className={cn("flex items-center gap-2 text-sm", config.color)}>
      {(state === 'THINKING' || state === 'IDLE') && <Loader2 className="w-4 h-4 animate-spin" />}
      <span>{config.label}</span>
      {state === 'SPEAKING' && !isPausable && <span className="opacity-50 text-xs ml-1">(buffering)</span>}
    </div>
  );
}

export function RealTimePlaybackView({
  hosts,
  topic,
  ragFiles,
  preGeneratedTranscript,
  onClose
}: RealTimePlaybackViewProps) {
  // State
  const [state, setState] = useState<ConversationState>('IDLE');
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [activeHostIndex, setActiveHostIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);

  // Interruption State
  const [isInterrupting, setIsInterrupting] = useState(false);
  const [interruptInput, setInterruptInput] = useState('');

  // Voice Interruption
  const {
    isRecording,
    isTranscribing,
    error: sttError,
    startRecording,
    stopRecording,
    reset: resetSTT,
  } = useSpeechToText();

  // Refs for tracking conversation flow
  const threadIdRef = useRef<string | null>(null);
  const isLoopRunningRef = useRef(false);
  const currentTurnAbortControllerRef = useRef<AbortController | null>(null);
  const spokenHistoryRef = useRef<string>("");
  const currentUnspokenBufferRef = useRef<string>("");
  const shouldInteruptRef = useRef(false);

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;

    const startSession = async () => {
      try {
        setState('IDLE');
        console.log('[Playback] Initializing session...');

        // 1. Initialize Backboard Session
        const id = await initializeSession({
          userId: 'user-default', // TODO: Get real user ID
          systemPrompt: `You are hosting a podcast with ${hosts.map(h => h.name).join(' and ')}.`,
          initialContext: topic || 'General Discussion',
          hostName: hosts[0].name,
          hostRole: hosts[0].role,
          hostPersonality: hosts[0].personality,
          coHosts: hosts.slice(1).map(h => ({ name: h.name, role: h.role, personality: h.personality })),
          ragContext: ragFiles?.map(f => f.rawTextMock).join('\n\n')
        });

        if (!mounted) return;
        threadIdRef.current = id;
        console.log('[Playback] Session initialized:', id);

        // 2. Start the infinite conversation loop
        setIsPlaying(true);
        runConversationLoop(id);

      } catch (err) {
        console.error('[Playback] Failed to start:', err);
        setError(err instanceof Error ? err.message : 'Failed to start session');
      }
    };

    startSession();

    return () => {
      mounted = false;
      shouldInteruptRef.current = true; // Signal loop to stop
      if (threadIdRef.current) {
        endSession(threadIdRef.current).catch(console.error);
      }
      currentTurnAbortControllerRef.current?.abort();
    };
  }, []);

  // Main Loop: Infinite Podcast Generation
  const runConversationLoop = async (threadId: string) => {
    if (isLoopRunningRef.current) return;
    isLoopRunningRef.current = true;

    let currentHostIdx = 0;
    shouldInteruptRef.current = false;

    try {
      while (!shouldInteruptRef.current) {
        // A. Determine current host
        const host = hosts[currentHostIdx];
        setActiveHostIndex(currentHostIdx);
        setState('THINKING');

        console.log(`[Playback] Getting turn for ${host.name}...`);

        try {
          // Create abort controller for this turn
          const abortController = new AbortController();
          currentTurnAbortControllerRef.current = abortController;

          // B. Start Speaking Chain (Streaming)
          // This function streams text from Backboard and plays audio immediately
          // It returns when the FULL turn is complete
          const result: SpeakingChainResult = await startSpeakingChain(
            threadId,
            host.voiceId || 'male-calm',
            (sentence) => {
              // On every sentence start:
              if (shouldInteruptRef.current) return; // Stop if interrupted

              // 1. Update UI
              setState('SPEAKING');
              setCurrentText(sentence);

              // 2. Append to Transcript
              setTranscript(prev => [...prev, {
                hostIndex: currentHostIdx,
                hostName: host.name,
                text: sentence,
                timestamp: Date.now()
              }]);

              // 3. Track uncommitted buffer for interruption logic
              currentUnspokenBufferRef.current += sentence + " ";
            },
            abortController.signal
          );

          currentTurnAbortControllerRef.current = null;

          // C. Turn Complete
          if (result.completed) {
            // Commit to history (clears buffer)
            spokenHistoryRef.current += result.spokenText + " ";
            currentUnspokenBufferRef.current = "";

            // Switch host for next turn
            currentHostIdx = (currentHostIdx + 1) % hosts.length;
          } else {
            // Interrupted mid-turn (via abort signal usually returns completed: false)
            console.log('[Playback] Turn interrupted/incomplete');
            break;
          }

        } catch (turnError) {
          if ((turnError as Error).message === 'Aborted') {
            console.log('[Playback] Turn aborted by interruption');
            break;
          }
          console.error('[Playback] Error in turn:', turnError);
          // Wait a bit before retrying to avoid loops
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    } catch (loopError) {
      console.error('[Playback] Loop crashed:', loopError);
      setError('Conversation ended unexpectedly');
    } finally {
      isLoopRunningRef.current = false;
      if (!shouldInteruptRef.current) {
        setState('IDLE');
      }
    }
  };

  // Handle User Interruption
  const handleUserInterruption = async (userInput: string) => {
    if (!threadIdRef.current) return;

    // 1. STOP everything immediately
    shouldInteruptRef.current = true; // Breaks the loop logic

    // Abort current audio/generation
    currentTurnAbortControllerRef.current?.abort();

    setState('LISTENING');
    setIsInterrupting(false);
    setInterruptInput('');

    console.log('[Playback] Handling interruption:', userInput);

    // 2. Call Backboard to handle interruption context
    try {
      const result = await handleInterruption(
        threadIdRef.current,
        spokenHistoryRef.current,
        currentUnspokenBufferRef.current, // The "rest" of what wasn't said
        userInput
      );

      // 3. Add User's Input to Transcript
      setTranscript(prev => [...prev, {
        hostIndex: -1, // User
        hostName: 'You',
        text: userInput,
        timestamp: Date.now()
      }]);

      // 4. Speak the AI's response (using speakTurn for single response)
      setActiveHostIndex(activeHostIndex); // Keep same host usually
      setState('SPEAKING');
      setCurrentText(result.text);

      // Create a temporary controller for this response
      const responseAbortController = new AbortController();
      currentTurnAbortControllerRef.current = responseAbortController;

      try {
        await speakTurn(
          result.text,
          hosts[activeHostIndex].voiceId || 'male-calm',
          responseAbortController.signal
        );
      } finally {
        currentTurnAbortControllerRef.current = null;
      }

      // Update history
      spokenHistoryRef.current += result.text + " ";
      currentUnspokenBufferRef.current = "";

      setTranscript(prev => [...prev, {
        hostIndex: activeHostIndex,
        hostName: hosts[activeHostIndex].name,
        text: result.text,
        timestamp: Date.now()
      }]);

      // 5. Resume the Loop
      // Wait for any previous loop to fully stop, then restart
      console.log('[Playback] Waiting for loop to stop before restarting...');

      // Give the loop time to fully exit (wait for abort to propagate)
      await new Promise(resolve => setTimeout(resolve, 300));

      // Force reset the loop state - we've aborted and waited, it should be stopped
      // If it's still marked as running, something went wrong with abort propagation
      if (isLoopRunningRef.current) {
        console.warn('[Playback] Force-resetting loop state after abort');
        isLoopRunningRef.current = false;
      }

      // Now reset the interrupt flag and restart
      shouldInteruptRef.current = false;

      console.log('[Playback] Restarting conversation loop...');
      runConversationLoop(threadIdRef.current!);

    } catch (err) {
      console.error('[Playback] Interruption failed:', err);
      setError('Could not process interruption');

      // Still try to resume on error
      shouldInteruptRef.current = false;
      if (!isLoopRunningRef.current && threadIdRef.current) {
        runConversationLoop(threadIdRef.current);
      }
    }
  };

  // Toggle Interruption UI - immediately stops audio when starting an interruption
  const handleInterruptToggle = () => {
    if (!isInterrupting) {
      // Immediately halt the podcast when opening interrupt UI
      shouldInteruptRef.current = true;
      currentTurnAbortControllerRef.current?.abort();
      setState('LISTENING');
      setIsInterrupting(true);
    } else {
      if (interruptInput.trim()) {
        handleUserInterruption(interruptInput);
      } else {
        // User cancelled without typing anything - resume playback
        setIsInterrupting(false);
        shouldInteruptRef.current = false;
        if (threadIdRef.current && !isLoopRunningRef.current) {
          runConversationLoop(threadIdRef.current);
        }
      }
    }
  };

  // Voice Interrupt Handler - immediately stops audio when starting recording
  const handleVoiceInterrupt = async () => {
    if (isRecording) {
      // Stop recording and transcribe
      try {
        const transcribedText = await stopRecording();
        if (transcribedText.trim()) {
          handleUserInterruption(transcribedText);
        } else {
          // No text transcribed - resume playback
          shouldInteruptRef.current = false;
          if (threadIdRef.current && !isLoopRunningRef.current) {
            runConversationLoop(threadIdRef.current);
          }
        }
      } catch (err) {
        console.error('[Playback] Voice interrupt failed:', err);
        setError('Could not transcribe audio. Please try again or use text input.');
        // Resume playback on error
        shouldInteruptRef.current = false;
        if (threadIdRef.current && !isLoopRunningRef.current) {
          runConversationLoop(threadIdRef.current);
        }
      }
    } else {
      // Start recording - immediately halt the podcast
      shouldInteruptRef.current = true;
      currentTurnAbortControllerRef.current?.abort();
      setState('LISTENING');
      try {
        resetSTT();
        await startRecording();
      } catch (err) {
        console.error('[Playback] Failed to start recording:', err);
        // Resume playback on error
        shouldInteruptRef.current = false;
        if (threadIdRef.current && !isLoopRunningRef.current) {
          runConversationLoop(threadIdRef.current);
        }
      }
    }
  };

  // Camera movement effect
  useEffect(() => {
    const targetX = activeHostIndex === 0 ? 15 : activeHostIndex === hosts.length - 1 ? -15 : 0;
    const targetY = Math.sin(Date.now() / 3000) * 5;

    const interval = setInterval(() => {
      setCameraOffset(prev => ({
        x: prev.x + (targetX - prev.x) * 0.05,
        y: prev.y + (targetY - prev.y) * 0.03
      }));
    }, 50);

    return () => clearInterval(interval);
  }, [activeHostIndex, hosts.length]);


  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black" style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #000000 100%)' }}>
      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-40"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)' }}
      />

      <DustParticles />

      {/* Enhanced gradient background with brand colors */}
      <div
        className="absolute inset-0 transition-transform duration-1000 ease-out"
        style={{
          background: `
            radial-gradient(ellipse at 30% 70%, rgba(235, 118, 31, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 30%, rgba(235, 118, 31, 0.05) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(235, 118, 31, 0.03) 0%, transparent 70%)
          `,
          transform: `translate(${cameraOffset.x}px, ${cameraOffset.y}px)`
        }}
      />

      {/* Exit button */}
      <div className="absolute top-6 left-6 z-50">
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-full text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* State indicator */}
      <div className="absolute top-6 right-6 z-50">
        <StateIndicator state={state} isPausable={isPlaying} />
      </div>

      {/* Error display */}
      {(error || sttError) && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm backdrop-blur-sm">
          {error || sttError}
        </div>
      )}

      {/* Main content */}
      <div
        className="relative z-30 h-full flex flex-col items-center px-8 transition-transform duration-1000 ease-out"
        style={{ transform: `translate(${cameraOffset.x * 0.5}px, ${cameraOffset.y * 0.5}px)` }}
      >
        {/* Avatars - Fixed position from top */}
        <div
          className="flex items-end justify-center gap-12 md:gap-24 pt-24 md:pt-32"
        >
          {hosts && hosts.length > 0 ? (
            hosts.map((host, index) => (
              <CinematicAvatar
                key={host.id}
                host={host}
                isActive={activeHostIndex === index}
                hostIndex={index}
                totalHosts={hosts.length}
                state={state}
              />
            ))
          ) : (
            <div className="text-white/50">Loading hosts...</div>
          )}
        </div>

        {/* Current text - Fixed height container with bottom margin for controls */}
        <div className="max-w-5xl w-full px-6 mt-16 md:mt-20 mb-32">
          <div className="relative h-[200px] md:h-[240px] flex items-center justify-center">
            {/* Enhanced background glow for text */}
            <div
              className="absolute inset-0 blur-3xl rounded-3xl transition-opacity duration-700"
              style={{
                background: `radial-gradient(ellipse at center, ${HOST_COLORS[activeHostIndex]}15 0%, transparent 70%)`,
                opacity: state === 'SPEAKING' ? 1 : 0.3
              }}
            />

            <div className="relative backdrop-blur-sm bg-black/20 rounded-2xl border border-white/5 shadow-2xl w-full h-full flex items-center justify-center">
              <p className="text-2xl md:text-4xl font-light leading-relaxed text-center text-foreground/95 px-10 py-8 transition-all duration-500">
                {currentText || (
                  <span className="flex items-center justify-center gap-3 text-muted-foreground">
                    {state === 'IDLE' && transcript.length === 0 ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#eb761f' }} />
                        <span>Connecting to studio...</span>
                      </>
                    ) : (
                      <span>Starting podcast...</span>
                    )}
                  </span>
                )}
              </p>

              {/* Animated border accent for active speaker */}
              {state === 'SPEAKING' && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 rounded-full"
                  style={{
                    width: '60%',
                    background: `linear-gradient(to right, transparent, ${HOST_COLORS[activeHostIndex]}, transparent)`,
                    boxShadow: `0 0 20px ${HOST_COLORS[activeHostIndex]}80`,
                    animation: 'pulse-glow 2s ease-in-out infinite',
                    transformOrigin: 'center'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
        {/* Interrupt input (shows when interrupting) */}
        {isInterrupting && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-96 mb-4 animate-in slide-in-from-bottom-2">
            <div className="bg-background/95 backdrop-blur-md border border-primary/20 rounded-2xl p-4 shadow-2xl">
              <label className="text-sm text-muted-foreground mb-2 block">
                Type your question or comment:
              </label>
              <textarea
                autoFocus
                value={interruptInput}
                onChange={(e) => setInterruptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleInterruptToggle();
                  }
                }}
                placeholder="e.g., Wait, can you explain that again?"
                className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Press Enter to send
              </p>
            </div>
          </div>
        )}

        {/* Control buttons */}
        <div className="flex items-center gap-4 px-6 py-4 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="w-10 h-10 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>

          {/* Text Interrupt button */}
          <Button
            variant={isInterrupting ? "default" : "secondary"}
            size="lg"
            onClick={handleInterruptToggle}
            className={cn(
              "rounded-full px-6 transition-all font-medium gap-2",
              isInterrupting
                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
            )}
          >
            {isInterrupting ? (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4" />
                Text
              </>
            )}
          </Button>

          {/* Voice Interrupt button */}
          <Button
            variant={isRecording ? "destructive" : "secondary"}
            size="lg"
            onClick={handleVoiceInterrupt}
            disabled={isTranscribing}
            className={cn(
              "rounded-full px-6 transition-all font-medium gap-2",
              isRecording
                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                : isTranscribing
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
            )}
            title={isRecording ? "Stop recording" : isTranscribing ? "Transcribing..." : "Voice interrupt"}
          >
            {isTranscribing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Transcribing...
              </>
            ) : isRecording ? (
              <>
                <MicOff className="w-4 h-4" />
                Stop
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Voice
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
