import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Trash2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PodcastSession {
    id: string;
    title: string;
    prompt: string;
    hosts: any;
    transcript: any;
    created_at: string;
}

export default function PodcastHistoryPage() {
    const [podcasts, setPodcasts] = useState<PodcastSession[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        fetchPodcasts();
    }, []);

    const fetchPodcasts = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                navigate('/auth');
                return;
            }

            const { data, error } = await supabase
                .from('podcast_sessions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setPodcasts(data || []);
        } catch (error) {
            console.error('Error fetching podcasts:', error);
            toast({
                title: 'Error',
                description: 'Failed to load podcast history',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const deletePodcast = async (id: string) => {
        if (!confirm('Are you sure you want to delete this podcast?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('podcast_sessions')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setPodcasts(prev => prev.filter(p => p.id !== id));
            toast({
                title: 'Success',
                description: 'Podcast deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting podcast:', error);
            toast({
                title: 'Error',
                description: 'Failed to delete podcast',
                variant: 'destructive'
            });
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const calculateDuration = (transcript: any[]) => {
        if (!Array.isArray(transcript)) return '0 min';
        const wordCount = transcript.reduce((acc, seg) => acc + (seg.text?.split(' ').length || 0), 0);
        const minutes = Math.ceil(wordCount / 150); // Assume 150 words per minute
        return `${minutes} min`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading podcasts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/dashboard')}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold">My Podcasts</h1>
                            <p className="text-muted-foreground">
                                {podcasts.length} {podcasts.length === 1 ? 'podcast' : 'podcasts'} saved
                            </p>
                        </div>
                    </div>
                    <Button onClick={() => navigate('/demo-studio')}>
                        Create New Podcast
                    </Button>
                </div>

                {/* Podcast Grid */}
                {podcasts.length === 0 ? (
                    <Card className="p-12 text-center">
                        <div className="max-w-md mx-auto">
                            <h2 className="text-2xl font-semibold mb-2">No podcasts yet</h2>
                            <p className="text-muted-foreground mb-6">
                                Create your first podcast to get started!
                            </p>
                            <Button onClick={() => navigate('/demo-studio')}>
                                Create Podcast
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {podcasts.map((podcast) => (
                            <Card key={podcast.id} className="p-6 hover:shadow-lg transition-shadow">
                                <div className="space-y-4">
                                    {/* Title */}
                                    <div>
                                        <h3 className="font-semibold text-lg line-clamp-2 mb-1">
                                            {podcast.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {formatDate(podcast.created_at)}
                                        </p>
                                    </div>

                                    {/* Hosts */}
                                    <div className="flex items-center gap-2">
                                        {Array.isArray(podcast.hosts) && podcast.hosts.slice(0, 3).map((host: any, idx: number) => (
                                            <div
                                                key={idx}
                                                className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium"
                                                title={host.name}
                                            >
                                                {host.name?.charAt(0) || 'H'}
                                            </div>
                                        ))}
                                        {Array.isArray(podcast.hosts) && podcast.hosts.length > 3 && (
                                            <span className="text-xs text-muted-foreground">
                                                +{podcast.hosts.length - 3}
                                            </span>
                                        )}
                                    </div>

                                    {/* Duration */}
                                    <div className="text-sm text-muted-foreground">
                                        Duration: {calculateDuration(podcast.transcript)}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            className="flex-1"
                                            onClick={() => navigate(`/podcasts/${podcast.id}/play`)}
                                        >
                                            <Play className="h-4 w-4 mr-2" />
                                            Play
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => deletePodcast(podcast.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
