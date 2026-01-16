import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PodcastSession } from '@/types/mentis';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, LogOut, ChevronRight, Mic, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';
import { HostConfig, PodcastSettings, TranscriptTurn } from '@/types/podcast';
import { PodcastDocument } from '@/types/mentis';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, profile, signOut, loading: authLoading } = useAuthContext();
  const [sessions, setSessions] = useState<PodcastSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<PodcastSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('podcast_sessions')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (data && !error) {
      const parsed = data.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        prompt: row.prompt,
        hosts: (row.hosts as unknown as HostConfig[]) || [],
        settings: (row.settings as unknown as PodcastSettings) || {},
        documents: (row.documents as unknown as PodcastDocument[]) || [],
        transcript: (row.transcript as unknown as TranscriptTurn[]) || [],
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
      setSessions(parsed);
    }
    
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    setIsDeleting(true);
    
    const { error } = await supabase
      .from('podcast_sessions')
      .delete()
      .eq('id', deleteTarget.id);
    
    if (error) {
      toast.error('Failed to delete podcast');
      console.error(error);
    } else {
      toast.success('Podcast deleted');
      setSessions(prev => prev.filter(p => p.id !== deleteTarget.id));
    }
    
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="p-6 md:p-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
            <Mic className="w-4 h-4 text-background" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Omnicast</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {profile?.full_name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-medium">Your Podcasts</h2>
          <Button
            onClick={() => navigate('/demo-studio')}
            className="rounded-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Podcast
          </Button>
        </div>

        {/* Podcasts grid */}
        {sessions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">You haven't created any podcasts yet</p>
            <Button
              onClick={() => navigate('/demo-studio')}
              variant="outline"
              className="rounded-full"
            >
              Create Your First Podcast
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'p-6 rounded-lg border bg-card',
                  'hover:border-muted-foreground transition-colors',
                  'flex items-center justify-between group'
                )}
              >
                <button
                  onClick={() => navigate(`/demo-studio?session=${session.id}`)}
                  className="flex-1 text-left"
                >
                  <h3 className="font-medium">{session.title || 'Untitled Podcast'}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                    {session.prompt}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(session.created_at).toLocaleDateString()}
                  </p>
                </button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(session);
                    }}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Podcast</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title || 'this podcast'}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
