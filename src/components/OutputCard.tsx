import { TranscriptTurn, HostConfig, GeneratedPodcast, GenerationStep } from '@/types/podcast';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface OutputCardProps {
  podcast: GeneratedPodcast | null;
  hosts: HostConfig[];
  generationStep?: GenerationStep;
}

const STEP_MESSAGES: Record<GenerationStep, string> = {
  idle: '',
  ingesting: 'Reading course materials...',
  extracting: 'Extracting key concepts...',
  assigning: 'Assigning viewpoints to hosts...',
  outline: 'Crafting the narrative structure...',
  generating: 'Generating engaging dialogue...',
  finalizing: 'Polishing the conversation...',
  complete: '',
};

function GeneratingState({ step }: { step: GenerationStep }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 py-12">
      <div className="relative">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <div className="absolute inset-0 blur-xl bg-primary/20" />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">
        {STEP_MESSAGES[step]}
      </p>
    </div>
  );
}

export function OutputCard({ podcast, hosts, generationStep = 'idle' }: OutputCardProps) {
  const transcript = podcast?.transcript || [];
  const isGenerating = generationStep !== 'idle' && generationStep !== 'complete';

  // Don't show anything before generation starts
  if (generationStep === 'idle' && transcript.length === 0) {
    return null;
  }

  // Show generating state
  if (isGenerating) {
    return (
      <div className="border border-border rounded-lg p-4">
        <GeneratingState step={generationStep} />
      </div>
    );
  }

  // Show transcript
  if (transcript.length === 0) {
    return null;
  }

  const getHostColor = (speakerId: string) => {
    const index = hosts.findIndex(h => h.id === speakerId);
    if (index === 0) return 'text-cyan-400';
    if (index === 1) return 'text-violet-400';
    return 'text-amber-400';
  };

  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-primary font-mono uppercase tracking-wider">
          {podcast?.title || 'TRANSCRIPT'}.TXT
        </span>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <button className="hover:text-foreground transition-colors">COPY</button>
          <button className="hover:text-foreground transition-colors">TXT</button>
          <button className="hover:text-foreground transition-colors">PDF</button>
        </div>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
        {transcript.map((turn, index) => (
          <div
            key={turn.id}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <span className={cn("text-xs font-medium", getHostColor(turn.speakerId))}>
              {turn.speakerName}:
            </span>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {turn.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
