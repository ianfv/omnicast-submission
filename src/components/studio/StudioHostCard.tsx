import { Settings2, Mic, User } from 'lucide-react';
import { HostConfig } from '@/types/podcast';
import { cn } from '@/lib/utils';

interface StudioHostCardProps {
  host: HostConfig;
  index: number;
  isSpeaking?: boolean;
  onEdit: () => void;
}

export function StudioHostCard({
  host,
  index,
  isSpeaking = false,
  onEdit,
}: StudioHostCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border transition-all duration-300',
        'bg-card/50 backdrop-blur-xl',
        'border-border/30 hover:border-border/50',
        'group cursor-pointer'
      )}
      onClick={onEdit}
    >
      {/* Profile Card */}
      <div className="p-6 flex flex-col items-center text-center">
        {/* Avatar with Animated Ring */}
        <div className="relative mb-4">
          {/* Animated gradient ring for speaking */}
          <div 
            className={cn(
              'absolute -inset-1 rounded-full opacity-0 transition-opacity duration-500',
              'bg-gradient-to-r from-primary/40 via-primary/20 to-primary/40',
              'animate-[spin_8s_linear_infinite]',
              isSpeaking && 'opacity-100'
            )}
            style={{ filter: 'blur(4px)' }}
          />
          
          {/* Avatar container */}
          <div className={cn(
            'relative w-20 h-20 rounded-full overflow-hidden',
            'ring-2 ring-border/20 transition-all duration-300',
            'bg-secondary/30',
            'group-hover:ring-primary/30',
            isSpeaking && 'ring-emerald-500/50 ring-4'
          )}>
            {host.avatarUrl ? (
              <img
                src={host.avatarUrl}
                alt={host.name}
                className={cn(
                  'w-full h-full object-cover transition-transform duration-300',
                  'group-hover:scale-105'
                )}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-8 h-8 text-muted-foreground/50" />
              </div>
            )}
          </div>
          
          {/* Status indicator */}
          <div className={cn(
            'absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card transition-all duration-300',
            isSpeaking ? 'bg-emerald-500 scale-110' : 'bg-muted-foreground/30'
          )} />
        </div>

        {/* Host info */}
        <h3 className="font-semibold text-foreground text-base tracking-tight mb-0.5">{host.name}</h3>
        <p className="text-sm text-muted-foreground mb-2">{host.role}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <Mic className="w-3 h-3" />
          <span>{host.voiceLabel}</span>
        </div>

        {/* Edit button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className={cn(
            'mt-4 p-2 rounded-lg transition-all duration-200',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-muted/40',
            'opacity-0 group-hover:opacity-100'
          )}
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
