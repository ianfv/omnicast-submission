import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TranscriptTurn, HostConfig, RagFile, PodcastSettings } from '@/types/podcast';
import { Button } from '@/components/ui/button';
import { X, Play, Pause, SkipBack, SkipForward, Send, Sparkles, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProducerControlPanel, ProducerAction, ProducerState } from './ProducerControlPanel';
import { useTTS } from '@/hooks/useTTS';

interface PlaybackViewProps {
  transcript: TranscriptTurn[];
  hosts: HostConfig[];
  ragFiles: RagFile[];
  settings: PodcastSettings;
  onClose: () => void;
  onAddRagFile: (file: File) => void;
  onRemoveRagFile: (fileId: string) => void;
  onUpdateSettings: (updates: Partial<PodcastSettings>) => void;
  onDirectionChange?: (direction: string) => void;
  onEnterViralClips?: () => void;
}

const HOST_COLORS = [
  'hsl(var(--host-a))',
  'hsl(var(--host-b))',
  'hsl(280, 70%, 60%)',
];

// Expression to visual mapping
const EXPRESSION_STYLES: Record<string, { scale: number; filter: string; emoji?: string }> = {
  neutral: { scale: 1, filter: 'none' },
  excited: { scale: 1.05, filter: 'brightness(1.1) saturate(1.2)' },
  thoughtful: { scale: 0.98, filter: 'brightness(0.95)' },
  skeptical: { scale: 1, filter: 'hue-rotate(-10deg)' },
  amused: { scale: 1.02, filter: 'brightness(1.05) saturate(1.1)' },
};

// Floating dust particles for ambient effect
function DustParticles() {
  const particles = useMemo(() => 
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * -20,
      opacity: Math.random() * 0.3 + 0.1,
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
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
            animationDelay: `${p.delay}s`,
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
    right: 'translate-x-1/4',
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
        transform: `translateX(-50%) ${isActive ? 'scale(1.2)' : 'scale(0.8)'}`,
      }}
    />
  );
}

function CinematicAvatar({ 
  host,
  isActive, 
  hostIndex,
  totalHosts,
  expression = 'neutral',
  producerTone = 50,
}: { 
  host: HostConfig;
  isActive: boolean; 
  hostIndex: number;
  totalHosts: number;
  expression?: 'neutral' | 'excited' | 'thoughtful' | 'skeptical' | 'amused';
  producerTone?: number;
}) {
  const avatarUrl = host.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${host.name}`;
  const hostColor = HOST_COLORS[hostIndex] || HOST_COLORS[0];
  const expressionStyle = EXPRESSION_STYLES[expression] || EXPRESSION_STYLES.neutral;
  
  // Tone affects visual intensity
  const toneMultiplier = 0.8 + (producerTone / 100) * 0.4;
  
  // Calculate curved stage position
  const angle = totalHosts === 1 ? 0 : ((hostIndex / (totalHosts - 1)) - 0.5) * 40;
  const depth = Math.cos((angle * Math.PI) / 180) * 30;
  
  const spotlightPosition = hostIndex === 0 ? 'left' : hostIndex === totalHosts - 1 ? 'right' : 'center';
  
  return (
    <div 
      className={cn(
        "relative flex flex-col items-center transition-all duration-700 ease-out",
        isActive ? "z-20" : "z-10"
      )}
      style={{
        transform: `
          perspective(1000px) 
          rotateY(${angle}deg) 
          translateZ(${depth}px)
          scale(${(isActive ? 1.15 : 0.85) * expressionStyle.scale * toneMultiplier})
        `,
        filter: isActive ? expressionStyle.filter : 'blur(2px) brightness(0.5)',
      }}
    >
      {/* Studio spotlight */}
      <StudioSpotlight 
        isActive={isActive} 
        color={hostColor} 
        position={spotlightPosition}
      />
      
      {/* Avatar container */}
      <div className="relative">
        {/* Outer glow ring - only when speaking */}
        {isActive && (
          <div 
            className="absolute -inset-6 rounded-full animate-speaker-glow"
            style={{ 
              background: `radial-gradient(circle, ${hostColor}40 0%, ${hostColor}20 40%, transparent 70%)`,
            }}
          />
        )}
        
        {/* Inner pulsing ring */}
        {isActive && (
          <div 
            className="absolute -inset-3 rounded-full border-2 animate-speaker-ring"
            style={{ borderColor: hostColor }}
          />
        )}
        
        {/* Main avatar */}
        <div 
          className={cn(
            "w-28 h-28 md:w-40 md:h-40 rounded-full overflow-hidden",
            "border-4 transition-all duration-700",
            "bg-gradient-to-br from-muted to-muted/50",
            "shadow-2xl"
          )}
          style={{ 
            borderColor: isActive ? hostColor : 'transparent',
            boxShadow: isActive 
              ? `0 0 60px ${hostColor}50, 0 20px 40px rgba(0,0,0,0.5)` 
              : '0 20px 40px rgba(0,0,0,0.3)'
          }}
        >
          <img 
            src={avatarUrl} 
            alt={host.name}
            className={cn(
              "w-full h-full object-cover transition-transform duration-700",
              isActive && "animate-cinematic-bob"
            )}
          />
        </div>
        
        {/* Speaking indicator waves */}
        {isActive && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full animate-sound-wave"
                style={{
                  backgroundColor: hostColor,
                  animationDelay: `${i * 80}ms`,
                  height: '10px'
                }}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Name tag with glow */}
      <div 
        className={cn(
          "mt-6 px-5 py-2 rounded-full transition-all duration-700",
          "text-sm font-semibold tracking-wider uppercase",
          isActive 
            ? "bg-white/10 backdrop-blur-md text-foreground" 
            : "bg-transparent text-muted-foreground/50"
        )}
        style={{
          boxShadow: isActive ? `0 0 20px ${hostColor}30` : 'none',
        }}
      >
        {host.name}
      </div>
    </div>
  );
}

function CinematicSubtitle({ 
  text, 
  previousTexts 
}: { 
  text: string; 
  previousTexts: string[];
}) {
  const [visibleWords, setVisibleWords] = useState(0);
  const words = useMemo(() => text.split(' '), [text]);
  
  // Words that should be emphasized (longer words, questions, exclamations)
  const isEmphasized = useCallback((word: string) => {
    const clean = word.replace(/[^a-zA-Z]/g, '');
    return clean.length > 8 || word.includes('?') || word.includes('!');
  }, []);
  
  useEffect(() => {
    setVisibleWords(0);
    const wordsPerChunk = 2;
    const totalChunks = Math.ceil(words.length / wordsPerChunk);
    const intervalTime = 300;
    
    let currentChunk = 0;
    const interval = setInterval(() => {
      currentChunk++;
      setVisibleWords(Math.min(currentChunk * wordsPerChunk, words.length));
      if (currentChunk >= totalChunks) {
        clearInterval(interval);
      }
    }, intervalTime);
    
    return () => clearInterval(interval);
  }, [text, words.length]);
  
  return (
    <div className="space-y-4">
      {/* Previous sentences - fading out */}
      {previousTexts.slice(-2).map((prevText, idx) => (
        <p 
          key={idx}
          className="text-lg md:text-xl font-light text-center text-muted-foreground/40 animate-subtitle-fade-out"
          style={{ 
            opacity: 0.3 - (0.1 * (2 - idx)),
            filter: 'blur(1px)',
          }}
        >
          {prevText}
        </p>
      ))}
      
      {/* Current sentence with karaoke effect */}
      <p className="text-2xl md:text-4xl font-medium leading-relaxed text-center text-foreground">
        {words.map((word, i) => {
          const emphasized = isEmphasized(word);
          return (
            <span
              key={i}
              className={cn(
                "inline-block transition-all duration-300 mx-1",
                i < visibleWords 
                  ? "opacity-100 translate-y-0" 
                  : "opacity-0 translate-y-2",
                emphasized && i < visibleWords && "animate-word-glow text-primary"
              )}
              style={{
                textShadow: emphasized && i < visibleWords 
                  ? '0 0 20px hsl(var(--primary) / 0.5)' 
                  : 'none',
              }}
            >
              {word}
            </span>
          );
        })}
      </p>
    </div>
  );
}

export function PlaybackView({ 
  transcript, 
  hosts, 
  onClose,
  onDirectionChange,
  onEnterViralClips,
}: PlaybackViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false); // Start paused to preload
  const [directionInput, setDirectionInput] = useState('');
  const [showDirectionSent, setShowDirectionSent] = useState(false);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const previousTextsRef = useRef<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isPreloading, setIsPreloading] = useState(true);
  
  // TTS hook for real voice synthesis
  const tts = useTTS();
  
  // Producer control state
  const [isProducerCollapsed, setIsProducerCollapsed] = useState(false);
  const [producerState, setProducerState] = useState<ProducerState>({
    toneValue: 50,
    debateIntensity: false,
    lastAction: null,
  });
  const [hostExpressions, setHostExpressions] = useState<Record<string, 'neutral' | 'excited' | 'thoughtful' | 'skeptical' | 'amused'>>({});
  
  const currentTurn = transcript[currentIndex];
  const currentHostIndex = hosts.findIndex(h => h.id === currentTurn?.speakerId);
  
  // Handle producer actions
  const handleProducerAction = useCallback((action: ProducerAction) => {
    setProducerState(prev => ({ ...prev, lastAction: action }));
    
    switch (action.type) {
      case 'tone_change':
        setProducerState(prev => ({ ...prev, toneValue: action.value }));
        // Update expressions based on tone
        if (action.value > 70) {
          setHostExpressions(prev => ({ ...prev, [hosts[currentHostIndex]?.id || '']: 'excited' }));
        } else if (action.value < 30) {
          setHostExpressions(prev => ({ ...prev, [hosts[currentHostIndex]?.id || '']: 'thoughtful' }));
        } else {
          setHostExpressions(prev => ({ ...prev, [hosts[currentHostIndex]?.id || '']: 'neutral' }));
        }
        break;
      case 'interrupt':
        // Skip to next speaker
        const nextIndex = transcript.findIndex((t, idx) => idx > currentIndex && t.speakerId !== currentTurn?.speakerId);
        if (nextIndex !== -1) {
          setCurrentIndex(nextIndex);
        } else if (currentIndex < transcript.length - 1) {
          setCurrentIndex(prev => prev + 1);
        }
        setHostExpressions(prev => ({ ...prev, [hosts[currentHostIndex]?.id || '']: 'skeptical' }));
        break;
      case 'follow_up':
        onDirectionChange?.(action.question);
        setHostExpressions(prev => ({ ...prev, [hosts[currentHostIndex]?.id || '']: 'thoughtful' }));
        break;
      case 'intensity_toggle':
        setProducerState(prev => ({ ...prev, debateIntensity: action.enabled }));
        // Update all hosts expressions when debate mode changes
        const newExpressions: Record<string, 'neutral' | 'excited' | 'thoughtful' | 'skeptical' | 'amused'> = {};
        hosts.forEach((h, idx) => {
          newExpressions[h.id] = action.enabled ? (idx % 2 === 0 ? 'excited' : 'skeptical') : 'neutral';
        });
        setHostExpressions(newExpressions);
        break;
    }
    
    // Reset expressions after a delay
    setTimeout(() => {
      setHostExpressions({});
    }, 3000);
  }, [currentIndex, currentHostIndex, currentTurn?.speakerId, hosts, onDirectionChange, transcript]);
  
  // Track previous texts for fading effect
  useEffect(() => {
    if (currentTurn?.text && currentIndex > 0) {
      const prevText = transcript[currentIndex - 1]?.text;
      if (prevText) {
        previousTextsRef.current = [...previousTextsRef.current.slice(-3), prevText];
      }
    }
  }, [currentIndex, currentTurn?.text, transcript]);
  
  // Helper to get voice ID for a host
  const getVoiceIdForHost = useCallback((speakerId: string): string => {
    const host = hosts.find(h => h.id === speakerId);
    return host?.voiceId || 'male-calm';
  }, [hosts]);
  
  // Preload audio on mount
  useEffect(() => {
    const preload = async () => {
      setIsPreloading(true);
      try {
        // Preload first few segments for faster start
        const preloadCount = Math.min(5, transcript.length);
        for (let i = 0; i < preloadCount; i++) {
          const turn = transcript[i];
          const voiceId = getVoiceIdForHost(turn.speakerId);
          const previousText = i > 0 ? transcript[i - 1].text : undefined;
          const nextText = i < transcript.length - 1 ? transcript[i + 1].text : undefined;
          await tts.generateAudio(turn.text, voiceId, previousText, nextText);
        }
      } catch (error) {
        console.error('[Playback] Preload error:', error);
      }
      setIsPreloading(false);
      setIsPlaying(true); // Auto-start after preload
    };
    
    preload();
    
    return () => {
      tts.stopAudio();
    };
  }, []); // Only on mount
  
  // Subtle camera pan effect toward active speaker (enhanced by tone)
  useEffect(() => {
    const intensity = producerState.toneValue / 50; // 0-2 multiplier
    const targetX = (currentHostIndex === 0 ? 15 : currentHostIndex === hosts.length - 1 ? -15 : 0) * intensity;
    const targetY = Math.sin(Date.now() / 3000) * 5 * intensity;
    
    const interval = setInterval(() => {
      setCameraOffset(prev => ({
        x: prev.x + (targetX - prev.x) * 0.05,
        y: prev.y + (targetY - prev.y) * 0.03,
      }));
    }, 50);
    
    return () => clearInterval(interval);
  }, [currentHostIndex, hosts.length, producerState.toneValue]);
  
  // Real TTS playback
  useEffect(() => {
    if (!isPlaying || currentIndex >= transcript.length || isMuted || isPreloading) return;
    
    const currentTurnData = transcript[currentIndex];
    if (!currentTurnData) return;
    
    const voiceId = getVoiceIdForHost(currentTurnData.speakerId);
    const previousText = currentIndex > 0 ? transcript[currentIndex - 1].text : undefined;
    const nextText = currentIndex < transcript.length - 1 ? transcript[currentIndex + 1].text : undefined;
    
    // Play audio and advance when done
    tts.playAudio(currentTurnData.text, voiceId, previousText, nextText, () => {
      if (currentIndex < transcript.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
      }
    });
    
    // Pre-cache next segment while current is playing
    if (currentIndex < transcript.length - 1) {
      const nextTurn = transcript[currentIndex + 1];
      const nextVoiceId = getVoiceIdForHost(nextTurn.speakerId);
      const nextPreviousText = currentTurnData.text;
      const nextNextText = currentIndex + 2 < transcript.length ? transcript[currentIndex + 2].text : undefined;
      tts.generateAudio(nextTurn.text, nextVoiceId, nextPreviousText, nextNextText);
    }
    
    return () => {
      // Don't stop on cleanup - let it finish naturally
    };
  }, [currentIndex, isPlaying, isMuted, isPreloading, transcript, getVoiceIdForHost, tts]);
  
  // Fallback for muted mode - still advance transcript visually
  useEffect(() => {
    if (!isPlaying || currentIndex >= transcript.length || !isMuted || isPreloading) return;
    
    const words = currentTurn?.text?.split(' ')?.length || 10;
    const speedMultiplier = 1.5 - (producerState.toneValue / 100) * 0.5;
    const delay = Math.max(2000, words * 300 * speedMultiplier);
    
    const timer = setTimeout(() => {
      if (currentIndex < transcript.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }, delay);
    
    return () => clearTimeout(timer);
  }, [currentIndex, isPlaying, isMuted, isPreloading, transcript.length, currentTurn?.text, producerState.toneValue]);
  
  const handlePrevious = useCallback(() => {
    tts.stopAudio();
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, [tts]);
  
  const handleNext = useCallback(() => {
    tts.stopAudio();
    setCurrentIndex(prev => Math.min(transcript.length - 1, prev + 1));
  }, [transcript.length, tts]);
  
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      tts.pauseAudio();
    } else {
      tts.resumeAudio();
    }
    setIsPlaying(prev => !prev);
  }, [isPlaying, tts]);
  
  const toggleMute = useCallback(() => {
    if (!isMuted) {
      tts.stopAudio();
    }
    setIsMuted(prev => !prev);
  }, [isMuted, tts]);

  const handleDirectionSubmit = useCallback(() => {
    if (!directionInput.trim()) return;
    
    onDirectionChange?.(directionInput.trim());
    setDirectionInput('');
    setShowDirectionSent(true);
    
    setTimeout(() => setShowDirectionSent(false), 2000);
  }, [directionInput, onDirectionChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleDirectionSubmit();
    }
  }, [handleDirectionSubmit]);
  
  if (!currentTurn) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden">
      {/* Producer Control Panel */}
      <ProducerControlPanel
        isCollapsed={isProducerCollapsed}
        onToggleCollapse={() => setIsProducerCollapsed(prev => !prev)}
        onAction={handleProducerAction}
        producerState={producerState}
      />
      
      {/* Vignette overlay - intensity based on producer tone */}
      <div 
        className="absolute inset-0 pointer-events-none z-40"
        style={{
          background: `radial-gradient(ellipse at center, transparent ${60 - producerState.toneValue * 0.2}%, rgba(0,0,0,${0.5 + producerState.toneValue * 0.003}) 100%)`,
        }}
      />
      
      {/* Debate mode overlay */}
      {producerState.debateIntensity && (
        <div 
          className="absolute inset-0 pointer-events-none z-35 animate-pulse"
          style={{
            background: 'linear-gradient(45deg, rgba(239,68,68,0.05) 0%, transparent 50%, rgba(249,115,22,0.05) 100%)',
          }}
        />
      )}
      
      {/* Ambient dust particles */}
      <DustParticles />
      
      {/* Gradient background with movement */}
      <div 
        className="absolute inset-0 transition-transform duration-1000 ease-out"
        style={{
          background: `
            radial-gradient(ellipse at 30% 70%, ${HOST_COLORS[0]}${producerState.debateIntensity ? '20' : '10'} 0%, transparent 50%),
            radial-gradient(ellipse at 70% 70%, ${HOST_COLORS[1]}${producerState.debateIntensity ? '20' : '10'} 0%, transparent 50%),
            linear-gradient(180deg, hsl(var(--background)) 0%, hsl(0 0% ${2 + producerState.toneValue * 0.02}%) 100%)
          `,
          transform: `translate(${cameraOffset.x}px, ${cameraOffset.y}px)`,
        }}
      />
      
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-6 right-6 z-50 text-muted-foreground/50 hover:text-foreground transition-colors"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </Button>
      
      {/* Progress bar - color changes with intensity */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 z-50">
        <div 
          className={cn(
            "h-full transition-all duration-500 ease-out",
            producerState.debateIntensity 
              ? "bg-gradient-to-r from-orange-500/70 to-red-500" 
              : "bg-gradient-to-r from-primary/50 to-primary"
          )}
          style={{ width: `${((currentIndex + 1) / transcript.length) * 100}%` }}
        />
      </div>
      
      {/* Main content with camera movement */}
      <div 
        className="relative z-30 h-full flex flex-col items-center justify-center px-8 transition-transform duration-1000 ease-out"
        style={{
          transform: `translate(${cameraOffset.x * 0.5}px, ${cameraOffset.y * 0.5}px)`,
        }}
      >
        {/* Curved stage with avatars */}
        <div 
          className="flex items-end justify-center gap-12 md:gap-24 mb-12 md:mb-16"
          style={{ perspective: '1200px' }}
        >
          {hosts.map((host, index) => (
            <CinematicAvatar 
              key={host.id}
              host={host}
              isActive={currentHostIndex === index} 
              hostIndex={index}
              totalHosts={hosts.length}
              expression={hostExpressions[host.id] || 'neutral'}
              producerTone={producerState.toneValue}
            />
          ))}
        </div>
        
        {/* Cinematic subtitle */}
        <div className="max-w-4xl w-full px-4">
          <CinematicSubtitle 
            key={currentIndex} 
            text={currentTurn.text}
            previousTexts={previousTextsRef.current}
          />
          
          <div className="text-center mt-8">
            <span className="text-xs text-muted-foreground/40 font-mono tracking-widest">
              {currentIndex + 1} / {transcript.length}
            </span>
          </div>
        </div>

        {/* Direction input field */}
        <div className="w-full max-w-2xl mt-10 px-4">
          <div className="relative">
            <input
              type="text"
              value={directionInput}
              onChange={(e) => setDirectionInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="steer the conversation..."
              className={cn(
                "w-full bg-transparent border-b border-white/10",
                "text-xl md:text-2xl font-light text-center",
                "placeholder:text-white/20 placeholder:font-light",
                "focus:outline-none focus:border-white/30",
                "transition-all duration-500 py-4",
                "tracking-wider"
              )}
            />
            {directionInput && (
              <button
                onClick={handleDirectionSubmit}
                className={cn(
                  "absolute right-0 top-1/2 -translate-y-1/2",
                  "text-white/30 hover:text-white/60",
                  "transition-colors duration-300"
                )}
              >
                <Send className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {/* Confirmation message */}
          <div className={cn(
            "text-center mt-4 text-sm text-primary/50 font-light tracking-widest uppercase",
            "transition-all duration-500",
            showDirectionSent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          )}>
            direction noted ✓
          </div>
        </div>
      </div>
      
      {/* Controls - more minimal and floating */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4">
        {/* Mute toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="text-white/30 hover:text-white/60 hover:bg-white/5 disabled:opacity-20 transition-all"
        >
          <SkipBack className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "w-14 h-14 rounded-full border transition-all",
            producerState.debateIntensity 
              ? "border-orange-500/40 hover:border-orange-500/60 hover:bg-orange-500/10" 
              : "border-white/20 hover:border-white/40 hover:bg-white/5"
          )}
          onClick={togglePlay}
          disabled={isPreloading}
        >
          {isPreloading ? (
            <Loader2 className="w-5 h-5 animate-spin text-white/60" />
          ) : isPlaying ? (
            <Pause className={cn(
              "w-5 h-5",
              producerState.debateIntensity ? "text-orange-400" : "text-white/60"
            )} />
          ) : (
            <Play className={cn(
              "w-5 h-5 ml-0.5",
              producerState.debateIntensity ? "text-orange-400" : "text-white/60"
            )} />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          disabled={currentIndex === transcript.length - 1}
          className="text-white/30 hover:text-white/60 hover:bg-white/5 disabled:opacity-20 transition-all"
        >
          <SkipForward className="w-4 h-4" />
        </Button>
        
        {/* TTS loading indicator */}
        {tts.isLoading && !isPreloading && (
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Loading voice...</span>
          </div>
        )}
      </div>
      
      {/* Viral Clips button */}
      {onEnterViralClips && (
        <Button
          onClick={onEnterViralClips}
          className="absolute bottom-8 right-8 z-50 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white gap-2 shadow-lg"
        >
          <Sparkles className="w-4 h-4" />
          Viral Clips
        </Button>
      )}
    </div>
  );
}