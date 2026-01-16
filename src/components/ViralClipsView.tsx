import { useState, useEffect, useMemo, useCallback } from 'react';
import { TranscriptTurn, HostConfig, ViralClip, ClipCategory } from '@/types/podcast';
import { Button } from '@/components/ui/button';
import { 
  X, 
  Play, 
  Pause, 
  Download, 
  Music, 
  Copy, 
  Check,
  Sparkles,
  Lightbulb,
  AlertTriangle,
  GraduationCap,
  Laugh,
  Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ViralClipsViewProps {
  transcript: TranscriptTurn[];
  hosts: HostConfig[];
  podcastTitle: string;
  onClose: () => void;
  onBackToPlayback: () => void;
}

const CATEGORY_CONFIG: Record<ClipCategory, { 
  label: string; 
  icon: typeof Sparkles; 
  color: string;
  bgColor: string;
}> = {
  'funny': { 
    label: 'Funny', 
    icon: Laugh, 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/20 border-yellow-400/30'
  },
  'insight': { 
    label: 'Key Insight', 
    icon: Lightbulb, 
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/20 border-blue-400/30'
  },
  'controversial': { 
    label: 'Controversial', 
    icon: AlertTriangle, 
    color: 'text-red-400',
    bgColor: 'bg-red-400/20 border-red-400/30'
  },
  'exam-tip': { 
    label: 'Exam Tip', 
    icon: GraduationCap, 
    color: 'text-green-400',
    bgColor: 'bg-green-400/20 border-green-400/30'
  },
};

// Simulated AI moment detection - in production this would be actual AI analysis
function detectViralMoments(transcript: TranscriptTurn[]): ViralClip[] {
  const clips: ViralClip[] = [];
  const totalTurns = transcript.length;
  
  // Create 3-5 clips from different parts of the transcript
  const clipCount = Math.min(5, Math.max(3, Math.floor(totalTurns / 4)));
  const categories: ClipCategory[] = ['funny', 'insight', 'controversial', 'exam-tip'];
  
  for (let i = 0; i < clipCount; i++) {
    const startIndex = Math.floor((i / clipCount) * totalTurns * 0.8);
    const clipLength = Math.min(4, totalTurns - startIndex); // 3-4 turns per clip
    const endIndex = startIndex + clipLength;
    
    if (endIndex > totalTurns) continue;
    
    const clipTranscript = transcript.slice(startIndex, endIndex);
    const category = categories[i % categories.length];
    
    // Calculate approximate duration (3-5 seconds per turn)
    const duration = clipLength * 4 + Math.random() * 10;
    
    clips.push({
      id: `clip-${i}`,
      startIndex,
      endIndex,
      category,
      label: generateClipLabel(category, clipTranscript),
      transcript: clipTranscript,
      duration: Math.round(duration),
    });
  }
  
  return clips;
}

function generateClipLabel(category: ClipCategory, transcript: TranscriptTurn[]): string {
  const firstText = transcript[0]?.text || '';
  const words = firstText.split(' ').slice(0, 5).join(' ');
  return words.length > 30 ? words.slice(0, 30) + '...' : words + '...';
}

// Vertical phone frame for clip preview
function VerticalClipPreview({ 
  clip, 
  hosts,
  isPlaying,
  onTogglePlay,
}: { 
  clip: ViralClip;
  hosts: HostConfig[];
  isPlaying: boolean;
  onTogglePlay: () => void;
}) {
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [visibleWords, setVisibleWords] = useState(0);
  
  const currentTurn = clip.transcript[currentTurnIndex];
  const currentHost = hosts.find(h => h.id === currentTurn?.speakerId);
  const words = currentTurn?.text.split(' ') || [];
  const config = CATEGORY_CONFIG[clip.category];
  const CategoryIcon = config.icon;
  
  // Animate through turns
  useEffect(() => {
    if (!isPlaying) return;
    
    const turnDuration = (clip.duration / clip.transcript.length) * 1000;
    const timer = setTimeout(() => {
      if (currentTurnIndex < clip.transcript.length - 1) {
        setCurrentTurnIndex(prev => prev + 1);
        setVisibleWords(0);
      } else {
        setCurrentTurnIndex(0);
        setVisibleWords(0);
      }
    }, turnDuration);
    
    return () => clearTimeout(timer);
  }, [currentTurnIndex, isPlaying, clip.duration, clip.transcript.length]);
  
  // Karaoke word animation
  useEffect(() => {
    if (!isPlaying) return;
    setVisibleWords(0);
    
    const wordsPerChunk = 2;
    let currentChunk = 0;
    const interval = setInterval(() => {
      currentChunk++;
      setVisibleWords(Math.min(currentChunk * wordsPerChunk, words.length));
      if (currentChunk * wordsPerChunk >= words.length) {
        clearInterval(interval);
      }
    }, 200);
    
    return () => clearInterval(interval);
  }, [currentTurnIndex, isPlaying, words.length]);
  
  const avatarUrl = currentHost?.avatarUrl || 
    `https://api.dicebear.com/7.x/personas/svg?seed=${currentHost?.name || 'Host'}`;
  
  return (
    <div className="relative w-full max-w-[280px] mx-auto">
      {/* Phone frame */}
      <div className="relative bg-black rounded-[2.5rem] p-2 shadow-2xl">
        {/* Screen */}
        <div 
          className="relative bg-gradient-to-b from-zinc-900 to-black rounded-[2rem] overflow-hidden"
          style={{ aspectRatio: '9/16' }}
        >
          {/* Status bar */}
          <div className="absolute top-0 inset-x-0 h-8 flex items-center justify-center z-20">
            <div className="w-20 h-5 bg-black rounded-full" />
          </div>
          
          {/* Category badge */}
          <div className={cn(
            "absolute top-12 left-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full border",
            config.bgColor
          )}>
            <CategoryIcon className={cn("w-4 h-4", config.color)} />
            <span className={cn("text-xs font-medium", config.color)}>
              {config.label}
            </span>
          </div>
          
          {/* Main content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 pt-20">
            {/* Avatar with glow */}
            <div className="relative mb-6">
              <div 
                className="absolute inset-0 rounded-full animate-pulse opacity-50 blur-xl"
                style={{ backgroundColor: 'hsl(var(--host-a))' }}
              />
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white/20">
                <img 
                  src={avatarUrl} 
                  alt={currentHost?.name}
                  className={cn(
                    "w-full h-full object-cover",
                    isPlaying && "animate-cinematic-bob"
                  )}
                />
              </div>
              {/* Sound waves */}
              {isPlaying && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-end gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-white rounded-full animate-sound-wave"
                      style={{ animationDelay: `${i * 80}ms`, height: '8px' }}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Host name */}
            <div className="text-white/60 text-sm font-medium mb-4">
              {currentHost?.name}
            </div>
            
            {/* Animated captions - TikTok style */}
            <div className="flex-1 flex items-center px-2">
              <p className="text-white text-lg font-bold text-center leading-tight">
                {words.map((word, i) => (
                  <span
                    key={i}
                    className={cn(
                      "inline-block mx-0.5 transition-all duration-150",
                      i < visibleWords 
                        ? "opacity-100 scale-100" 
                        : "opacity-0 scale-75"
                    )}
                    style={{
                      textShadow: i < visibleWords 
                        ? '0 2px 10px rgba(0,0,0,0.8), 0 0 30px rgba(255,255,255,0.3)' 
                        : 'none',
                    }}
                  >
                    {word}
                  </span>
                ))}
              </p>
            </div>
            
            {/* Progress dots */}
            <div className="flex gap-1.5 mb-4">
              {clip.transcript.map((_, i) => (
                <div 
                  key={i}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                    i === currentTurnIndex 
                      ? "bg-white scale-125" 
                      : i < currentTurnIndex 
                        ? "bg-white/40" 
                        : "bg-white/20"
                  )}
                />
              ))}
            </div>
          </div>
          
          {/* Play/Pause overlay */}
          <button
            onClick={onTogglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors group"
          >
            {!isPlaying && (
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
            )}
          </button>
          
          {/* Social ready badge */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-2">
            <div className="px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-white" />
              <span className="text-xs font-medium text-white">Social Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Timeline with clips
function ClipTimeline({ 
  clips, 
  totalTurns,
  selectedClip,
  onSelectClip,
}: { 
  clips: ViralClip[];
  totalTurns: number;
  selectedClip: ViralClip | null;
  onSelectClip: (clip: ViralClip) => void;
}) {
  return (
    <div className="w-full">
      {/* Timeline bar */}
      <div className="relative h-2 bg-white/10 rounded-full mb-4 overflow-hidden">
        {/* Clip markers */}
        {clips.map((clip) => {
          const left = (clip.startIndex / totalTurns) * 100;
          const width = ((clip.endIndex - clip.startIndex) / totalTurns) * 100;
          const config = CATEGORY_CONFIG[clip.category];
          
          return (
            <button
              key={clip.id}
              onClick={() => onSelectClip(clip)}
              className={cn(
                "absolute h-full transition-all duration-300 hover:brightness-125",
                selectedClip?.id === clip.id && "ring-2 ring-white ring-offset-2 ring-offset-background"
              )}
              style={{
                left: `${left}%`,
                width: `${Math.max(width, 3)}%`,
                backgroundColor: clip.category === 'funny' ? '#facc15' 
                  : clip.category === 'insight' ? '#60a5fa'
                  : clip.category === 'controversial' ? '#f87171'
                  : '#4ade80',
              }}
            />
          );
        })}
      </div>
      
      {/* Clip chips */}
      <div className="flex flex-wrap gap-2 justify-center">
        {clips.map((clip) => {
          const config = CATEGORY_CONFIG[clip.category];
          const Icon = config.icon;
          const isSelected = selectedClip?.id === clip.id;
          
          return (
            <button
              key={clip.id}
              onClick={() => onSelectClip(clip)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300",
                "hover:scale-105 active:scale-95",
                isSelected 
                  ? "bg-white text-black border-white" 
                  : config.bgColor
              )}
            >
              <Icon className={cn("w-4 h-4", isSelected ? "text-black" : config.color)} />
              <span className={cn(
                "text-sm font-medium",
                isSelected ? "text-black" : "text-white"
              )}>
                {config.label}
              </span>
              <span className={cn(
                "text-xs",
                isSelected ? "text-black/60" : "text-white/60"
              )}>
                {clip.duration}s
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ViralClipsView({ 
  transcript, 
  hosts, 
  podcastTitle,
  onClose,
  onBackToPlayback,
}: ViralClipsViewProps) {
  const [selectedClip, setSelectedClip] = useState<ViralClip | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Detect viral moments
  const clips = useMemo(() => detectViralMoments(transcript), [transcript]);
  
  // Auto-select first clip
  useEffect(() => {
    if (clips.length > 0 && !selectedClip) {
      setSelectedClip(clips[0]);
    }
  }, [clips, selectedClip]);
  
  const handleSelectClip = useCallback((clip: ViralClip) => {
    setSelectedClip(clip);
    setIsPlaying(false);
  }, []);
  
  const handleCopyCaption = useCallback(() => {
    if (!selectedClip) return;
    
    const captionText = selectedClip.transcript
      .map(t => `${t.speakerName}: ${t.text}`)
      .join('\n');
    
    navigator.clipboard.writeText(captionText);
    setCopied(true);
    toast.success('Caption copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }, [selectedClip]);
  
  const handleExportVideo = useCallback(() => {
    toast.success('Video export started! (Demo mode)');
  }, []);
  
  const handleExportAudio = useCallback(() => {
    toast.success('Audio export started! (Demo mode)');
  }, []);
  
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden">
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse at 20% 30%, hsl(var(--host-a) / 0.3) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, hsl(var(--host-b) / 0.3) 0%, transparent 50%),
            linear-gradient(180deg, hsl(var(--background)) 0%, hsl(0 0% 2%) 100%)
          `,
        }}
      />
      
      {/* Vignette */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
        }}
      />
      
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToPlayback}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Back to Playback
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full border border-pink-500/30">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="text-sm font-medium text-pink-300">Viral Clips Mode</span>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="relative z-10 flex flex-col lg:flex-row gap-8 px-6 pb-6 h-[calc(100vh-100px)]">
        {/* Left side - Timeline & Clips */}
        <div className="lg:w-1/2 flex flex-col">
          <h1 className="text-2xl font-bold text-foreground mb-2">{podcastTitle}</h1>
          <p className="text-muted-foreground mb-6">
            {clips.length} viral moments detected
          </p>
          
          {/* Timeline */}
          <div className="mb-8">
            <ClipTimeline 
              clips={clips}
              totalTurns={transcript.length}
              selectedClip={selectedClip}
              onSelectClip={handleSelectClip}
            />
          </div>
          
          {/* Selected clip info */}
          {selectedClip && (
            <div className="flex-1 overflow-auto">
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  {(() => {
                    const config = CATEGORY_CONFIG[selectedClip.category];
                    const Icon = config.icon;
                    return (
                      <>
                        <div className={cn("p-2 rounded-lg", config.bgColor)}>
                          <Icon className={cn("w-5 h-5", config.color)} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{config.label}</h3>
                          <p className="text-sm text-muted-foreground">{selectedClip.duration} seconds</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                
                {/* Transcript preview */}
                <div className="space-y-3 mb-6">
                  {selectedClip.transcript.map((turn, i) => (
                    <div key={turn.id} className="flex gap-3">
                      <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">
                        {turn.speakerName}
                      </span>
                      <p className="text-sm text-foreground/80">{turn.text}</p>
                    </div>
                  ))}
                </div>
                
                {/* Export buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleExportVideo}
                    className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Vertical Video
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleExportAudio}
                    className="gap-2 border-white/20 hover:bg-white/10"
                  >
                    <Music className="w-4 h-4" />
                    Audio Only
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleCopyCaption}
                    className="gap-2 border-white/20 hover:bg-white/10"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Caption
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Right side - Vertical Preview */}
        <div className="lg:w-1/2 flex items-center justify-center">
          {selectedClip && (
            <VerticalClipPreview
              clip={selectedClip}
              hosts={hosts}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(p => !p)}
            />
          )}
        </div>
      </div>
      
      {/* Share hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-muted-foreground/50 text-sm">
        <Share2 className="w-4 h-4" />
        <span>Export and share to TikTok, YouTube Shorts, or Instagram Reels</span>
      </div>
    </div>
  );
}