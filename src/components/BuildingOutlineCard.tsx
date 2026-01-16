import { useState, useEffect } from 'react';
import { Sparkles, MessageSquare, Lightbulb, HelpCircle, Quote } from 'lucide-react';
import { HostConfig } from '@/types/podcast';
import { cn } from '@/lib/utils';

interface Viewpoint {
  id: string;
  text: string;
  hostId: string;
  type: 'insight' | 'question' | 'counterpoint' | 'example';
}

interface BuildingOutlineCardProps {
  hosts: HostConfig[];
  isActive: boolean;
  topic: string;
  onComplete?: () => void;
}

const VIEWPOINT_ICONS = {
  insight: Lightbulb,
  question: HelpCircle,
  counterpoint: MessageSquare,
  example: Quote,
};

// Generate mock viewpoints based on topic
function generateViewpoints(topic: string, hosts: HostConfig[]): Viewpoint[] {
  const templates = [
    { text: `Explain the fundamentals of ${topic}`, type: 'insight' as const },
    { text: `But what about the limitations?`, type: 'counterpoint' as const },
    { text: `How does this apply in practice?`, type: 'question' as const },
    { text: `Real-world case study of ${topic}`, type: 'example' as const },
    { text: `Common misconceptions about ${topic}`, type: 'insight' as const },
    { text: `Why do some experts disagree?`, type: 'counterpoint' as const },
  ];

  return templates.map((t, idx) => ({
    id: `vp-${idx}`,
    text: t.text,
    hostId: hosts[idx % hosts.length]?.id || 'host-a',
    type: t.type,
  }));
}

export function BuildingOutlineCard({ hosts, isActive, topic, onComplete }: BuildingOutlineCardProps) {
  const [viewpoints, setViewpoints] = useState<Viewpoint[]>([]);
  const [visibleViewpoints, setVisibleViewpoints] = useState<Set<string>>(new Set());
  const [assignedViewpoints, setAssignedViewpoints] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isActive) {
      setViewpoints([]);
      setVisibleViewpoints(new Set());
      setAssignedViewpoints(new Set());
      return;
    }

    const vps = generateViewpoints(topic || 'this topic', hosts);
    setViewpoints(vps);

    // Reveal viewpoints one by one
    vps.forEach((vp, idx) => {
      setTimeout(() => {
        setVisibleViewpoints((prev) => new Set([...prev, vp.id]));
      }, idx * 400);
    });

    // Then assign to hosts
    const assignDelay = vps.length * 400 + 500;
    vps.forEach((vp, idx) => {
      setTimeout(() => {
        setAssignedViewpoints((prev) => new Set([...prev, vp.id]));
      }, assignDelay + idx * 300);
    });

    // Complete after all assignments
    const completeDelay = assignDelay + vps.length * 300 + 500;
    const timeout = setTimeout(() => {
      onComplete?.();
    }, completeDelay);

    return () => clearTimeout(timeout);
  }, [isActive, topic, hosts, onComplete]);

  if (!isActive) return null;

  const getHostColor = (hostId: string) => {
    const idx = hosts.findIndex((h) => h.id === hostId);
    if (idx === 0) return { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-400' };
    if (idx === 1) return { bg: 'bg-violet-500/20', border: 'border-violet-500/50', text: 'text-violet-400' };
    return { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400' };
  };

  const getHost = (hostId: string) => hosts.find((h) => h.id === hostId);

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-medium">Building Episode Outline</h3>
          <p className="text-xs text-muted-foreground">
            Detecting viewpoints and assigning to hosts
          </p>
        </div>
      </div>

      {/* Host legend */}
      <div className="flex gap-4 mb-4">
        {hosts.slice(0, 3).map((host, idx) => {
          const colors = getHostColor(host.id);
          return (
            <div key={host.id} className="flex items-center gap-2">
              <div className={cn('w-5 h-5 rounded-full border overflow-hidden', colors.border)}>
                {host.avatarUrl ? (
                  <img src={host.avatarUrl} alt={host.name} className="w-full h-full object-cover" />
                ) : (
                  <div className={cn('w-full h-full flex items-center justify-center text-[8px] font-bold', colors.bg, colors.text)}>
                    {host.name[0]}
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{host.name}</span>
            </div>
          );
        })}
      </div>

      {/* Viewpoints */}
      <div className="space-y-2">
        {viewpoints.map((vp) => {
          const isVisible = visibleViewpoints.has(vp.id);
          const isAssigned = assignedViewpoints.has(vp.id);
          const colors = getHostColor(vp.hostId);
          const host = getHost(vp.hostId);
          const Icon = VIEWPOINT_ICONS[vp.type];

          if (!isVisible) return null;

          return (
            <div
              key={vp.id}
              className={cn(
                'flex items-center gap-3 p-2 rounded-md border transition-all duration-500 animate-outline-appear',
                isAssigned ? colors.bg : 'bg-muted/30',
                isAssigned ? colors.border : 'border-transparent'
              )}
            >
              <Icon className={cn('w-4 h-4', isAssigned ? colors.text : 'text-muted-foreground')} />
              <span className="text-xs flex-1">{vp.text}</span>
              
              {isAssigned && host && (
                <div className={cn('flex items-center gap-1.5 animate-scale-in')}>
                  <div className="w-4 h-4 rounded-full border overflow-hidden">
                    {host.avatarUrl ? (
                      <img src={host.avatarUrl} alt={host.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted text-[6px] flex items-center justify-center">
                        {host.name[0]}
                      </div>
                    )}
                  </div>
                  <span className={cn('text-[10px] font-medium', colors.text)}>{host.name}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
