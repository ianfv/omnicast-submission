import { useState, useRef } from 'react';
import { Mic, Sparkles, ChevronDown, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { 
  HostConfig, 
  VOICE_OPTIONS, 
  ROLE_OPTIONS, 
  AVATAR_PRESETS_BY_CATEGORY,
  PERSONALITY_TRAITS,
  AvatarCategory 
} from '@/types/podcast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface HostCustomizerProps {
  hosts: HostConfig[];
  onUpdateHost: (hostId: string, updates: Partial<HostConfig>) => void;
}

const AVATAR_CATEGORIES: { id: AvatarCategory; label: string }[] = [
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'expressive', label: 'Expressive' },
];

function HostCard({ 
  host, 
  index, 
  onUpdateHost,
  isExpanded,
  onToggleExpand
}: { 
  host: HostConfig; 
  index: number; 
  onUpdateHost: (hostId: string, updates: Partial<HostConfig>) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const [avatarCategory, setAvatarCategory] = useState<AvatarCategory>('professional');
  const [hoveredAvatar, setHoveredAvatar] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const avatars = AVATAR_PRESETS_BY_CATEGORY[avatarCategory];
  const featuredAvatarUrl = hoveredAvatar || host.avatarUrl || avatars[0]?.url;

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -100 : 100,
      behavior: 'smooth'
    });
  };

  return (
    <div 
      className={cn(
        'relative overflow-hidden rounded-2xl border transition-all duration-300',
        'bg-card/50 backdrop-blur-xl border-border/30',
        isExpanded && 'border-border/50 shadow-xl shadow-black/10'
      )}
    >
      {/* Header - Always visible */}
      <button
        onClick={onToggleExpand}
        className="w-full p-5 flex items-center gap-4 text-left"
      >
        {/* Avatar */}
        <div className="relative">
          <div className={cn(
            'w-16 h-16 rounded-full overflow-hidden ring-2 ring-border/20',
            'bg-secondary/30 transition-all duration-300'
          )}>
            {host.avatarUrl ? (
              <img 
                src={host.avatarUrl} 
                alt={host.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-6 h-6 text-muted-foreground/50" />
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-base truncate">{host.name}</h3>
          <p className="text-sm text-muted-foreground truncate">{host.role}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Mic className="w-3 h-3 text-muted-foreground/60" />
            <span className="text-xs text-muted-foreground/60">{host.voiceLabel}</span>
          </div>
        </div>

        {/* Expand button */}
        <ChevronDown className={cn(
          'w-5 h-5 text-muted-foreground transition-transform duration-300',
          isExpanded && 'rotate-180'
        )} />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border/20 animate-fade-in">
          {/* Avatar Selection */}
          <div className="p-5 space-y-4">
            {/* Featured Avatar */}
            <div className="flex justify-center">
              <div className="relative">
                <div className={cn(
                  'absolute -inset-2 rounded-full opacity-50 blur-lg',
                  'bg-gradient-to-r from-primary/30 via-transparent to-primary/30'
                )} />
                <div className={cn(
                  'relative w-24 h-24 rounded-full overflow-hidden',
                  'ring-2 ring-primary/30 bg-secondary/30'
                )}>
                  <img
                    src={featuredAvatarUrl}
                    alt="Selected avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex justify-center gap-1 p-1 bg-muted/20 rounded-xl">
              {AVATAR_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setAvatarCategory(cat.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300',
                    avatarCategory === cat.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Carousel */}
            <div className="relative">
              <button
                onClick={() => scrollCarousel('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground border border-border/30"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              
              <button
                onClick={() => scrollCarousel('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground border border-border/30"
              >
                <ChevronRight className="w-3 h-3" />
              </button>

              <div
                ref={carouselRef}
                className="flex gap-2 overflow-x-auto scrollbar-hide px-8 py-1"
                style={{ scrollbarWidth: 'none' }}
              >
                {avatars.map((avatar) => {
                  const isSelected = host.avatarUrl === avatar.url;
                  const isHovered = hoveredAvatar === avatar.url;
                  
                  return (
                    <button
                      key={avatar.id}
                      onClick={() => onUpdateHost(host.id, { avatarUrl: avatar.url })}
                      onMouseEnter={() => setHoveredAvatar(avatar.url)}
                      onMouseLeave={() => setHoveredAvatar(null)}
                      className={cn(
                        'flex-shrink-0 rounded-lg overflow-hidden transition-all duration-300',
                        isSelected ? 'w-12 h-12 ring-2 ring-primary' : 'w-10 h-10 ring-1 ring-border/30',
                        (isHovered && !isSelected) && 'scale-110 ring-2 ring-muted-foreground/50',
                        'bg-secondary/30'
                      )}
                    >
                      <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Host Identity */}
          <div className="px-5 pb-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="h-px flex-1 bg-border/30" />
              <span>Host Identity</span>
              <div className="h-px flex-1 bg-border/30" />
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Name</Label>
              <Input
                value={host.name}
                onChange={(e) => onUpdateHost(host.id, { name: e.target.value })}
                placeholder="Host name"
                className="h-10 bg-muted/20 border-border/30"
              />
            </div>

            {/* Voice */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Voice</Label>
              <Select
                value={host.voiceId}
                onValueChange={(value) => {
                  const voice = VOICE_OPTIONS.find(v => v.id === value);
                  onUpdateHost(host.id, { 
                    voiceId: value,
                    voiceLabel: voice?.label || value
                  });
                }}
              >
                <SelectTrigger className="h-10 bg-muted/20 border-border/30">
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {VOICE_OPTIONS.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Role</Label>
              <Select
                value={host.role}
                onValueChange={(value) => onUpdateHost(host.id, { role: value })}
              >
                <SelectTrigger className="h-10 bg-muted/20 border-border/30">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Personality */}
          <div className="px-5 pb-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="h-px flex-1 bg-border/30" />
              <span>Personality</span>
              <div className="h-px flex-1 bg-border/30" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {PERSONALITY_TRAITS.map((trait) => {
                const isSelected = host.personality === trait.value;
                
                return (
                  <button
                    key={trait.value}
                    onClick={() => onUpdateHost(host.id, { personality: trait.value })}
                    className={cn(
                      'p-3 rounded-xl text-left transition-all duration-300 border',
                      isSelected
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-muted/10 border-border/20 hover:border-border/40'
                    )}
                  >
                    <div className={cn(
                      'font-medium text-sm',
                      isSelected ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {trait.label}
                    </div>
                    <div className="text-xs text-muted-foreground/60 mt-0.5">
                      {trait.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function HostCustomizer({ hosts, onUpdateHost }: HostCustomizerProps) {
  const [expandedHostId, setExpandedHostId] = useState<string | null>(hosts[0]?.id || null);

  const handleToggleExpand = (hostId: string) => {
    setExpandedHostId(prev => prev === hostId ? null : hostId);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-medium">Studio Talent</h2>
        </div>
        <span className="text-xs text-muted-foreground">{hosts.length} hosts configured</span>
      </div>

      {/* Host cards */}
      <div className="grid gap-3">
        {hosts.map((host, index) => (
          <HostCard
            key={host.id}
            host={host}
            index={index}
            onUpdateHost={onUpdateHost}
            isExpanded={expandedHostId === host.id}
            onToggleExpand={() => handleToggleExpand(host.id)}
          />
        ))}
      </div>
    </div>
  );
}
