import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, User, Mic, Sparkles, X } from 'lucide-react';
import { 
  HostConfig, 
  VOICE_OPTIONS, 
  ROLE_OPTIONS, 
  AVATAR_PRESETS_BY_CATEGORY,
  PERSONALITY_TRAITS,
  AvatarCategory
} from '@/types/podcast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface HostEditorSheetProps {
  host: HostConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateHost: (hostId: string, updates: Partial<HostConfig>) => void;
}

const AVATAR_CATEGORIES: { id: AvatarCategory; label: string }[] = [
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'expressive', label: 'Expressive' },
];

export function HostEditorSheet({
  host,
  open,
  onOpenChange,
  onUpdateHost,
}: HostEditorSheetProps) {
  const [avatarCategory, setAvatarCategory] = useState<AvatarCategory>('professional');
  const [hoveredAvatar, setHoveredAvatar] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  if (!host) return null;

  const avatars = AVATAR_PRESETS_BY_CATEGORY[avatarCategory];
  const featuredAvatarUrl = hoveredAvatar || host.avatarUrl || avatars[0]?.url;

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const scrollAmount = 100;
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-background border-border p-0">
        <DialogHeader className="space-y-4 p-6 pb-0">
          {/* Featured Avatar */}
          <div className="flex justify-center pt-2">
            <div className="relative">
              {/* Glow effect */}
              <div 
                className={cn(
                  'absolute -inset-4 rounded-full transition-all duration-500',
                  'bg-gradient-to-r from-primary/30 via-transparent to-primary/30',
                  'opacity-60 blur-xl'
                )}
              />
              
              {/* Main avatar */}
              <div className={cn(
                'relative w-24 h-24 rounded-full overflow-hidden',
                'ring-2 ring-primary/40',
                'bg-secondary/30 transition-all duration-300'
              )}>
                {featuredAvatarUrl ? (
                  <img
                    src={featuredAvatarUrl}
                    alt={host.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-10 h-10 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogTitle className="text-center text-lg">
            Edit {host.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-6 pt-4">
          {/* Avatar Selection */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Avatar Style</span>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-1 p-1 bg-muted/30 rounded-xl">
              {AVATAR_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setAvatarCategory(cat.id)}
                  className={cn(
                    'flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300',
                    avatarCategory === cat.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Avatar Carousel */}
            <div className="relative">
              <button
                onClick={() => scrollCarousel('left')}
                className={cn(
                  'absolute left-0 top-1/2 -translate-y-1/2 z-10',
                  'w-6 h-6 rounded-full bg-background/90 backdrop-blur-sm',
                  'flex items-center justify-center',
                  'text-muted-foreground hover:text-foreground',
                  'border border-border/50 shadow-md',
                  'transition-all duration-200 hover:scale-105'
                )}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              
              <button
                onClick={() => scrollCarousel('right')}
                className={cn(
                  'absolute right-0 top-1/2 -translate-y-1/2 z-10',
                  'w-6 h-6 rounded-full bg-background/90 backdrop-blur-sm',
                  'flex items-center justify-center',
                  'text-muted-foreground hover:text-foreground',
                  'border border-border/50 shadow-md',
                  'transition-all duration-200 hover:scale-105'
                )}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <div
                ref={carouselRef}
                className="flex gap-2 overflow-x-auto scrollbar-hide px-8 py-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
                        'flex-shrink-0 transition-all duration-300',
                        'rounded-xl overflow-hidden',
                        isSelected 
                          ? 'w-12 h-12 ring-2 ring-primary shadow-lg shadow-primary/20' 
                          : 'w-10 h-10 ring-1 ring-border/40',
                        (isHovered && !isSelected) && 'scale-110 ring-2 ring-muted-foreground/50',
                        'bg-secondary/30'
                      )}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Host Identity */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <User className="w-3.5 h-3.5" />
              <span>Host Identity</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Name</Label>
                <Input
                  value={host.name}
                  onChange={(e) => onUpdateHost(host.id, { name: e.target.value })}
                  placeholder="Enter host name"
                  className="h-10 bg-muted/20 border-border/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Voice</Label>
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
                    <SelectTrigger className="h-10 bg-muted/20 border-border/40">
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

                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Role</Label>
                  <Select
                    value={host.role}
                    onValueChange={(value) => onUpdateHost(host.id, { role: value })}
                  >
                    <SelectTrigger className="h-10 bg-muted/20 border-border/40">
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
            </div>
          </section>

          {/* Personality */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Mic className="w-3.5 h-3.5" />
              <span>Personality</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {PERSONALITY_TRAITS.map((trait) => {
                const isSelected = host.personality === trait.value;
                
                return (
                  <button
                    key={trait.value}
                    onClick={() => onUpdateHost(host.id, { personality: trait.value })}
                    className={cn(
                      'p-3 rounded-xl text-left transition-all duration-300',
                      'border',
                      isSelected
                        ? 'bg-primary/10 border-primary/40 shadow-lg shadow-primary/10'
                        : 'bg-muted/10 border-border/30 hover:border-border/50 hover:bg-muted/20'
                    )}
                  >
                    <div className={cn(
                      'font-medium text-sm mb-0.5 transition-colors',
                      isSelected ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {trait.label}
                    </div>
                    <div className="text-xs text-muted-foreground/70 leading-snug">
                      {trait.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
