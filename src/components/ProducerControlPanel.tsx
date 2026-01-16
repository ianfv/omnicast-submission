import { useState, useCallback, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  MessageCircle, 
  Flame, 
  Zap,
  Volume2,
  Sparkles,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import omnicastLogo from '@/assets/omnicast-icon.png';

export interface ProducerState {
  toneValue: number; // 0-100 (calm to intense)
  debateIntensity: boolean;
  lastAction: ProducerAction | null;
}

export type ProducerAction = 
  | { type: 'tone_change'; value: number }
  | { type: 'interrupt' }
  | { type: 'follow_up'; question: string }
  | { type: 'intensity_toggle'; enabled: boolean };

interface ProducerControlPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onAction: (action: ProducerAction) => void;
  producerState: ProducerState;
}

// AI reaction indicator
function AIReactingIndicator({ action }: { action: ProducerAction | null }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (action) {
      let msg = '';
      switch (action.type) {
        case 'tone_change':
          msg = action.value > 70 ? 'Ramping up energy...' : action.value < 30 ? 'Calming the tone...' : 'Adjusting tone...';
          break;
        case 'interrupt':
          msg = 'Cutting to next speaker...';
          break;
        case 'follow_up':
          msg = 'Weaving in your question...';
          break;
        case 'intensity_toggle':
          msg = action.enabled ? 'Increasing debate tension...' : 'Easing debate tension...';
          break;
      }
      setMessage(msg);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [action]);

  return (
    <div 
      className={cn(
        "absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap",
        "px-4 py-2 rounded-full bg-primary/10 border border-primary/20",
        "text-xs font-medium text-primary flex items-center gap-2",
        "transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      )}
    >
      <Sparkles className="w-3 h-3 animate-pulse" />
      {message}
    </div>
  );
}

export function ProducerControlPanel({
  isCollapsed,
  onToggleCollapse,
  onAction,
  producerState,
}: ProducerControlPanelProps) {
  const [followUpInput, setFollowUpInput] = useState('');
  const [showFollowUpSent, setShowFollowUpSent] = useState(false);

  const handleToneChange = useCallback((values: number[]) => {
    onAction({ type: 'tone_change', value: values[0] });
  }, [onAction]);

  const handleInterrupt = useCallback(() => {
    onAction({ type: 'interrupt' });
  }, [onAction]);

  const handleFollowUp = useCallback(() => {
    if (!followUpInput.trim()) return;
    onAction({ type: 'follow_up', question: followUpInput.trim() });
    setFollowUpInput('');
    setShowFollowUpSent(true);
    setTimeout(() => setShowFollowUpSent(false), 2000);
  }, [followUpInput, onAction]);

  const handleIntensityToggle = useCallback((enabled: boolean) => {
    onAction({ type: 'intensity_toggle', enabled });
  }, [onAction]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFollowUp();
    }
  }, [handleFollowUp]);

  const getToneLabel = () => {
    if (producerState.toneValue < 25) return 'Calm';
    if (producerState.toneValue < 50) return 'Balanced';
    if (producerState.toneValue < 75) return 'Energetic';
    return 'Intense';
  };

  const getToneColor = () => {
    if (producerState.toneValue < 25) return 'text-cyan-400';
    if (producerState.toneValue < 50) return 'text-green-400';
    if (producerState.toneValue < 75) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div 
      className={cn(
        "fixed left-4 top-1/2 -translate-y-1/2 z-50",
        "transition-all duration-500 ease-out"
      )}
    >
      {/* AI Producer badge */}
      <div className="absolute -top-8 left-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-primary/30">
        <img src={omnicastLogo} alt="" className="w-3 h-3 object-contain animate-pulse" />
        <span className="text-xs font-semibold tracking-wider uppercase text-primary/80">AI Producer</span>
      </div>

      {/* AI Reacting indicator */}
      <AIReactingIndicator action={producerState.lastAction} />

      {/* Main panel */}
      <div 
        className={cn(
          "relative bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10",
          "shadow-2xl shadow-black/50 transition-all duration-500",
          isCollapsed ? "w-14 py-3" : "w-64 py-5 px-4"
        )}
      >
        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className={cn(
            "absolute -right-3 top-1/2 -translate-y-1/2",
            "w-6 h-12 rounded-full bg-black/80 border border-white/10",
            "flex items-center justify-center",
            "text-white/40 hover:text-white/70 transition-colors"
          )}
        >
          {isCollapsed ? <ChevronUp className="w-3 h-3 rotate-90" /> : <ChevronDown className="w-3 h-3 rotate-90" />}
        </button>

        {isCollapsed ? (
          // Collapsed view - just icons
          <div className="flex flex-col items-center gap-4">
            <Volume2 className="w-4 h-4 text-white/40" />
            <MicOff className="w-4 h-4 text-white/40" />
            <MessageCircle className="w-4 h-4 text-white/40" />
            <Flame className="w-4 h-4 text-white/40" />
          </div>
        ) : (
          // Expanded view
          <div className="space-y-6">
            {/* Tone Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-white/60 uppercase tracking-wider flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5" />
                  Steer Tone
                </label>
                <span className={cn("text-xs font-bold", getToneColor())}>
                  {getToneLabel()}
                </span>
              </div>
              <div className="relative">
                <Slider
                  value={[producerState.toneValue]}
                  onValueChange={handleToneChange}
                  max={100}
                  step={1}
                  className="w-full"
                />
                {/* Tone gradient bar */}
                <div className="absolute -bottom-2 left-0 right-0 h-1 rounded-full opacity-30"
                  style={{
                    background: 'linear-gradient(90deg, #22d3ee 0%, #22c55e 33%, #f59e0b 66%, #ef4444 100%)'
                  }}
                />
              </div>
            </div>

            {/* Interrupt Button */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wider flex items-center gap-2">
                <MicOff className="w-3.5 h-3.5" />
                Speaker Control
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleInterrupt}
                className={cn(
                  "w-full bg-red-500/10 border-red-500/30 text-red-400",
                  "hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300",
                  "transition-all duration-200"
                )}
              >
                <Zap className="w-4 h-4 mr-2" />
                Interrupt Speaker
              </Button>
            </div>

            {/* Follow-up Question */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wider flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5" />
                Ask Follow-up
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={followUpInput}
                  onChange={(e) => setFollowUpInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a question..."
                  className={cn(
                    "w-full bg-white/5 border border-white/10 rounded-lg",
                    "text-sm text-white placeholder:text-white/30",
                    "px-3 py-2 pr-10",
                    "focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20",
                    "transition-all duration-200"
                  )}
                />
                {followUpInput && (
                  <button
                    onClick={handleFollowUp}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/60 hover:text-primary transition-colors"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}
              </div>
              {showFollowUpSent && (
                <p className="text-xs text-primary/60 animate-fade-in">Question queued ✓</p>
              )}
            </div>

            {/* Debate Intensity Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-3.5 h-3.5" />
                Debate Mode
              </label>
              <div 
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg transition-all duration-300",
                  producerState.debateIntensity 
                    ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30" 
                    : "bg-white/5 border border-white/10"
                )}
              >
                <div className="flex items-center gap-2">
                  <Flame className={cn(
                    "w-4 h-4 transition-colors",
                    producerState.debateIntensity ? "text-orange-400 animate-pulse" : "text-white/40"
                  )} />
                  <span className={cn(
                    "text-sm font-medium transition-colors",
                    producerState.debateIntensity ? "text-orange-300" : "text-white/60"
                  )}>
                    {producerState.debateIntensity ? 'Heated' : 'Normal'}
                  </span>
                </div>
                <Switch
                  checked={producerState.debateIntensity}
                  onCheckedChange={handleIntensityToggle}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}