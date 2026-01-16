import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GenerationStep } from '@/types/podcast';
import { cn } from '@/lib/utils';

interface StudioGenerateButtonProps {
  generationStep: GenerationStep;
  disabled: boolean;
  onGenerate: () => void;
}

const STEP_LABELS: Record<GenerationStep, string> = {
  idle: '',
  ingesting: 'Analyzing materials…',
  extracting: 'Extracting concepts…',
  assigning: 'Assigning perspectives…',
  outline: 'Building outline…',
  generating: 'Generating episode…',
  finalizing: 'Finalizing…',
  complete: 'Complete',
};

export function StudioGenerateButton({
  generationStep,
  disabled,
  onGenerate,
}: StudioGenerateButtonProps) {
  const isGenerating = generationStep !== 'idle' && generationStep !== 'complete';

  return (
    <Button
      onClick={onGenerate}
      disabled={disabled || isGenerating}
      className={cn(
        'w-full h-14 text-base font-semibold rounded-xl transition-all duration-300',
        'shadow-lg',
        'bg-foreground hover:bg-foreground/90 text-background shadow-foreground/10',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none'
      )}
    >
      {isGenerating ? (
        <span className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          {STEP_LABELS[generationStep]}
        </span>
      ) : (
        <span className="flex items-center gap-3">
          <Sparkles className="w-5 h-5" />
          Generate Episode
        </span>
      )}
    </Button>
  );
}
