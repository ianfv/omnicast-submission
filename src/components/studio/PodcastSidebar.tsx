import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PanelLeftClose, 
  PanelLeft, 
  SquarePen, 
  Search, 
  MoreHorizontal,
  Trash2,
  Pencil,
  ChevronRight,
  X
} from 'lucide-react';
import omnicastLogo from '@/assets/omnicast-icon.png';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PastPodcast {
  id: string;
  title: string;
  createdAt: Date;
}

// User's podcasts - empty by default, would be populated from database
const userPodcasts: PastPodcast[] = [];

export function PodcastSidebar() {
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';
  
  const [selectedId, setSelectedId] = useState<string | null>('1');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleNewPodcast = () => {
    setSelectedId(null);
  };

  const handleSeeMore = () => {
    navigate('/dashboard');
  };

  const handleSearchClick = () => {
    setIsSearchOpen(true);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  // Filter podcasts based on search query
  const filteredPodcasts = userPodcasts.filter(podcast =>
    podcast.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasPodcasts = userPodcasts.length > 0;

  // Icon button component for consistent styling
  const IconButton = ({ 
    icon: Icon, 
    label, 
    onClick,
    className 
  }: { 
    icon: React.ElementType; 
    label: string; 
    onClick?: () => void;
    className?: string;
  }) => {
    const button = (
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        className={cn(
          'h-10 w-10 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50',
          className
        )}
      >
        <Icon className="w-5 h-5" />
      </Button>
    );

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="bg-zinc-800 text-zinc-100 border-zinc-700">
            {label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <Sidebar
      className={cn(
        'border-r border-zinc-800 bg-zinc-900 transition-all duration-300',
        isCollapsed ? 'w-[68px]' : 'w-64'
      )}
      collapsible="icon"
    >
      {/* Header */}
      <SidebarHeader className={cn(
        'p-3',
        isCollapsed ? 'space-y-2' : 'space-y-2'
      )}>
        {/* Top bar with toggle and logo */}
        <div className="flex items-center justify-between">
          {isCollapsed ? (
            <IconButton 
              icon={PanelLeft} 
              label="Expand sidebar" 
              onClick={toggleSidebar}
            />
          ) : (
            <>
              <img src={omnicastLogo} alt="Omnicast" className="w-9 h-9 object-contain" />
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-9 w-9 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50"
              >
                <PanelLeftClose className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>

        {/* New podcast button */}
        {isCollapsed ? (
          <div className="flex justify-center">
            <IconButton 
              icon={SquarePen} 
              label="New podcast" 
              onClick={handleNewPodcast}
            />
          </div>
        ) : (
          <Button
            onClick={handleNewPodcast}
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 h-10',
              'text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700/50'
            )}
          >
            <SquarePen className="w-5 h-5" />
            <span>New podcast</span>
          </Button>
        )}

        {/* Search podcasts - only show if user has podcasts */}
        {hasPodcasts && (
          isCollapsed ? (
            <div className="flex justify-center">
              <IconButton 
                icon={Search} 
                label="Search podcasts"
                onClick={handleSearchClick}
              />
            </div>
          ) : isSearchOpen ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search podcasts..."
                autoFocus
                className="w-full pl-9 pr-8 h-10 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-600"
              />
              {(searchQuery || isSearchOpen) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearSearch}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ) : (
            <Button
              onClick={handleSearchClick}
              variant="ghost"
              className="w-full justify-start gap-3 h-10 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50"
            >
              <Search className="w-5 h-5" />
              <span>Search podcasts</span>
            </Button>
          )
        )}
      </SidebarHeader>

      {/* Content - Podcast list (only when expanded and has podcasts) */}
      {!isCollapsed && hasPodcasts && (
        <SidebarContent className="px-2 pt-2">
          <p className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Podcasts
          </p>
          
          <SidebarMenu>
            {filteredPodcasts.length === 0 ? (
              <p className="px-3 py-4 text-sm text-zinc-500 text-center">
                No podcasts found
              </p>
            ) : (
              filteredPodcasts.map((podcast) => {
                const isSelected = selectedId === podcast.id;
                const isHovered = hoveredId === podcast.id;
                
                return (
                  <SidebarMenuItem key={podcast.id}>
                    <SidebarMenuButton
                      onClick={() => setSelectedId(podcast.id)}
                      onMouseEnter={() => setHoveredId(podcast.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className={cn(
                        'w-full px-3 py-2.5 rounded-lg transition-colors group',
                        'text-sm',
                        isSelected 
                          ? 'bg-zinc-700/60 text-zinc-100' 
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/40'
                      )}
                    >
                      <div className="flex items-center w-full gap-3">
                        <span className="truncate flex-1 text-left">{podcast.title}</span>
                        
                        {(isHovered || isSelected) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-100 hover:bg-zinc-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 bg-zinc-800 border-zinc-700">
                              <DropdownMenuItem className="gap-2 text-zinc-300 hover:text-zinc-100 focus:bg-zinc-700">
                                <Pencil className="w-3.5 h-3.5" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 text-red-400 focus:text-red-400 focus:bg-zinc-700">
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })
            )}
          </SidebarMenu>

          {/* See more */}
          <Button
            variant="ghost"
            onClick={handleSeeMore}
            className="w-full justify-start gap-3 h-10 mt-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/30"
          >
            <ChevronRight className="w-4 h-4" />
            <span>See more</span>
          </Button>
        </SidebarContent>
      )}

    </Sidebar>
  );
}

// Floating toggle button when sidebar is collapsed (removed - using in-sidebar toggle now)
export function SidebarToggleButton() {
  return null;
}
