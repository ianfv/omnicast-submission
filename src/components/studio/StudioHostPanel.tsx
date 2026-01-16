import { useState } from 'react';
import { Mic2, MessageSquare, Swords, Users } from 'lucide-react';
import { HostConfig, AVATAR_PRESETS } from '@/types/podcast';
import { StudioHostCard } from './StudioHostCard';
import { HostEditorSheet } from './HostEditorSheet';
import { cn } from '@/lib/utils';

interface StudioHostPanelProps {
  hosts: HostConfig[];
  onUpdateHost: (hostId: string, updates: Partial<HostConfig>) => void;
}

const PRESETS = [
  { id: 'panel', label: 'Expert Panel', icon: Users },
  { id: 'debate', label: 'Debate Show', icon: Swords },
  { id: 'casual', label: 'Casual Chat', icon: MessageSquare },
];

export function StudioHostPanel({ hosts, onUpdateHost }: StudioHostPanelProps) {
  const [editingHost, setEditingHost] = useState<HostConfig | null>(null);

  const applyPreset = (presetId: string) => {
    const presetConfigs: Record<string, Partial<HostConfig>[]> = {
      panel: [
        {
          name: 'Dr. Chen',
          role: 'Professor',
          voiceId: 'female-professional',
          voiceLabel: 'Female - Professional',
          personality: 'analytical',
          avatarUrl: AVATAR_PRESETS[0].url
        },
        {
          name: 'Marcus',
          role: 'Industry Expert',
          voiceId: 'male-deep',
          voiceLabel: 'Male - Deep',
          personality: 'serious',
          avatarUrl: AVATAR_PRESETS[1].url
        },
        {
          name: 'Jamie',
          role: 'Curious Learner',
          voiceId: 'female-energetic',
          voiceLabel: 'Female - Energetic',
          personality: 'enthusiastic',
          avatarUrl: AVATAR_PRESETS[2].url
        },
      ],
      debate: [
        {
          name: 'Alex',
          role: 'Tech Lead',
          voiceId: 'male-calm',
          voiceLabel: 'Male - Calm',
          personality: 'supportive',
          avatarUrl: AVATAR_PRESETS[3].url
        },
        {
          name: 'Riley',
          role: "Devil's Advocate",
          voiceId: 'british-crisp',
          voiceLabel: 'British - Crisp',
          personality: 'skeptical',
          avatarUrl: AVATAR_PRESETS[4].url
        },
        {
          name: 'Sam',
          role: 'Moderator',
          voiceId: 'female-warm',
          voiceLabel: 'Female - Warm',
          personality: 'analytical',
          avatarUrl: AVATAR_PRESETS[5].url
        },
      ],
      casual: [
        {
          name: 'Morgan',
          role: 'Senior Engineer',
          voiceId: 'male-energetic',
          voiceLabel: 'Male - Energetic',
          personality: 'humorous',
          avatarUrl: AVATAR_PRESETS[0].url
        },
        {
          name: 'Taylor',
          role: 'Frontend Developer',
          voiceId: 'female-energetic',
          voiceLabel: 'Female - Energetic',
          personality: 'enthusiastic',
          avatarUrl: AVATAR_PRESETS[1].url
        },
        {
          name: 'Casey',
          role: 'Junior Developer',
          voiceId: 'british-warm',
          voiceLabel: 'British - Warm',
          personality: 'supportive',
          avatarUrl: AVATAR_PRESETS[2].url
        },
      ],
    };

    const configs = presetConfigs[presetId];
    if (!configs) return;

    // Only apply to hosts that exist
    hosts.forEach((host, index) => {
      if (configs[index]) {
        onUpdateHost(host.id, configs[index]);
      }
    });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
              <Mic2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Studio Talent</h2>
              <p className="text-xs text-muted-foreground">{hosts.length} hosts configured</p>
            </div>
          </div>
        </div>

        {/* Host cards - horizontal row */}
        <div className={cn(
          'grid gap-4',
          hosts.length === 1 && 'grid-cols-1 max-w-sm',
          hosts.length === 2 && 'grid-cols-2',
          hosts.length >= 3 && 'grid-cols-3'
        )}>
          {hosts.map((host, index) => (
            <StudioHostCard
              key={host.id}
              host={host}
              index={index}
              onEdit={() => setEditingHost(host)}
            />
          ))}
        </div>

        {/* Presets toolbar */}
        <div className="flex items-center gap-2 pt-2">
          <span className="text-xs text-muted-foreground mr-2">Quick setup:</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium',
                'border border-border/50 bg-transparent',
                'text-muted-foreground hover:text-foreground',
                'hover:border-muted-foreground/50 hover:bg-muted/30',
                'transition-all duration-200'
              )}
            >
              <preset.icon className="w-3.5 h-3.5" />
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Host Editor Sheet */}
      <HostEditorSheet
        host={editingHost}
        open={!!editingHost}
        onOpenChange={(open) => !open && setEditingHost(null)}
        onUpdateHost={onUpdateHost}
      />
    </>
  );
}
