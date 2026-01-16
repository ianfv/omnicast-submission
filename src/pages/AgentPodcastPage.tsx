import { Header } from '@/components/Header';
import { AgentPodcast } from '@/components/AgentPodcast';
import { MultiVoiceTTSDemo } from '@/components/MultiVoiceTTSDemo';

export default function AgentPodcastPage() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-1 flex flex-col items-center justify-center p-4 gap-8">
                <AgentPodcast />

                <div className="w-full max-w-2xl border-t pt-8">
                    <h2 className="text-xl font-bold text-center mb-4 text-muted-foreground">Dev Tools: TTS Stream Test</h2>
                    <MultiVoiceTTSDemo />
                </div>
            </main>
        </div>
    );
}
