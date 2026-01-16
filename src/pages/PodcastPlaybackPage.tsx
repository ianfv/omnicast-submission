import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { RealTimePlaybackView } from '@/components/RealTimePlaybackView';
import { useToast } from '@/hooks/use-toast';

export default function PodcastPlaybackPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [podcast, setPodcast] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) {
            navigate('/podcasts');
            return;
        }
        loadPodcast();
    }, [id]);

    const loadPodcast = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                navigate('/auth');
                return;
            }

            const { data, error } = await supabase
                .from('podcast_sessions')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();

            if (error) throw error;

            if (!data) {
                toast({
                    title: 'Not Found',
                    description: 'Podcast not found',
                    variant: 'destructive'
                });
                navigate('/podcasts');
                return;
            }

            setPodcast(data);
        } catch (error) {
            console.error('Error loading podcast:', error);
            toast({
                title: 'Error',
                description: 'Failed to load podcast',
                variant: 'destructive'
            });
            navigate('/podcasts');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading podcast...</p>
                </div>
            </div>
        );
    }

    if (!podcast) {
        return null;
    }

    return (
        <RealTimePlaybackView
            hosts={podcast.hosts || []}
            topic={podcast.prompt}
            podcastId={podcast.id}
            savedTranscript={podcast.transcript}
            ragFiles={podcast.documents || []}
            onClose={() => navigate('/podcasts')}
        />
    );
}
