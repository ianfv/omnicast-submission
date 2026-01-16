import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Share2, Copy, Check, Loader2, Sparkles, Radio } from 'lucide-react';
import { Header } from '@/components/Header';
import { StudioHostPanel } from '@/components/studio/StudioHostPanel';
import { StudioTopicInput } from '@/components/studio/StudioTopicInput';
import { StudioGenerateButton } from '@/components/studio/StudioGenerateButton';
import { PodcastSidebar, SidebarToggleButton } from '@/components/studio/PodcastSidebar';
import { OutputCard } from '@/components/OutputCard';
import { RealTimePlaybackView } from '@/components/RealTimePlaybackView';
import { ViralClipsView } from '@/components/ViralClipsView';
import { DocumentIngestionPreview } from '@/components/DocumentIngestionPreview';
import { BuildingOutlineCard } from '@/components/BuildingOutlineCard';
import { usePodcastStore } from '@/hooks/usePodcastStore';
import { Button } from '@/components/ui/button';
import { SidebarProvider } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuthContext } from '@/contexts/AuthContext';
import omnicastLogo from '@/assets/omnicast-icon-new.png';
import { OmnicastSpinner } from '@/components/OmnicastSpinner';
import { LottieAvatar } from '@/components/LottieAvatar';
import Lottie from 'lottie-react';
import loadingAnimation from '@/assets/loadinglottie.json';

export default function DemoStudioPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthContext();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const hasAutoStarted = useRef(false);
  const [isFromSetupFlow, setIsFromSetupFlow] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  
  const {
    hosts,
    settings,
    ragFiles,
    currentPodcast,
    generationStep,
    prompt,
    isPlaybackMode,
    isViralClipsMode,
    setPrompt,
    updateHost,
    updateSettings,
    addRagFile,
    removeRagFile,
    generate,
    exitPlaybackMode,
    enterViralClipsMode,
    exitViralClipsMode,
    backToPlayback,
  } = usePodcastStore();

  // Auto-start generation when coming from setup flow
  useEffect(() => {
    const autostart = searchParams.get('autostart');
    if (autostart === 'true' && !hasAutoStarted.current && prompt?.trim() && generationStep === 'idle') {
      hasAutoStarted.current = true;
      setIsFromSetupFlow(true);
      // Clear the URL param
      searchParams.delete('autostart');
      setSearchParams(searchParams, { replace: true });
      // Trigger generation
      generate();
    }
  }, [searchParams, setSearchParams, prompt, generationStep, generate]);

  // Demo share code (in production this would be generated/stored)
  const shareCode = 'DEMO42';
  const shareLink = `${window.location.origin}/join?code=${shareCode}`;

  const copyToClipboard = (text: string, type: 'link' | 'code') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const isGenerating = generationStep !== 'idle' && generationStep !== 'complete';

  // Rotating status messages
  const rotatingMessages = [
    'Setting up the mics...',
    'Dialing in the headphones...',
    'Hosts are getting comfy...',
    'Brewing some coffee...',
    'Adjusting the sound levels...',
    'Finding the perfect vibe...',
    'Warming up the voices...',
    'Getting into character...',
    'Crafting the conversation...',
    'Almost ready to record...'
  ];

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (prompt.trim() && generationStep === 'idle') {
          generate();
        }
      }
      if (e.key === 'Escape') {
        if (isViralClipsMode) {
          exitViralClipsMode();
        } else if (isPlaybackMode) {
          exitPlaybackMode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt, generationStep, isPlaybackMode, isViralClipsMode, generate, exitPlaybackMode, exitViralClipsMode]);

  // Rotate messages every 3 seconds
  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % rotatingMessages.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isGenerating, rotatingMessages.length]);

  // Show viral clips view
  if (isViralClipsMode && currentPodcast) {
    return (
      <ViralClipsView
        transcript={currentPodcast.transcript}
        hosts={hosts}
        podcastTitle={currentPodcast.title}
        onClose={exitViralClipsMode}
        onBackToPlayback={backToPlayback}
      />
    );
  }

  // Show real-time playback view when podcast is ready
  if (isPlaybackMode && currentPodcast) {
    // Convert GeneratedPodcast transcript to RealTimePlaybackView format
    const preGeneratedTranscript = currentPodcast.transcript.map(turn => {
      const hostIndex = hosts.findIndex(h => h.id === turn.speakerId);
      return {
        hostIndex: hostIndex >= 0 ? hostIndex : 0,
        hostName: turn.speakerName,
        text: turn.text
      };
    });

    return (
      <RealTimePlaybackView
        hosts={hosts}
        topic={prompt}
        podcastId="demo"
        ragFiles={ragFiles}
        preGeneratedTranscript={preGeneratedTranscript}
        onClose={() => {
          exitPlaybackMode();
          // If coming from setup flow, navigate back to setup summary page
          if (isFromSetupFlow) {
            navigate('/setup?step=summary');
          }
        }}
      />
    );
  }

  // Show full-screen generating view when coming from setup flow
  if (isFromSetupFlow && isGenerating) {
    const stepMessages: Record<string, string> = {
      ingesting: 'Analyzing your documents...',
      extracting: 'Extracting key insights...',
      outline: 'Building conversation outline...',
      assigning: 'Assigning host perspectives...',
      generating: rotatingMessages[currentMessageIndex],
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#eb761f]/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#eb761f]/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
        </div>

        <div className="text-center space-y-10 max-w-lg px-6 relative z-10">
          {/* Lottie loading animation */}
          <div className="relative flex items-center justify-center">
            <div className="w-64 h-64">
              <Lottie
                animationData={loadingAnimation}
                loop={true}
                autoplay={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>

          {/* Host avatars with stagger animation */}
          <div className="flex justify-center -space-x-4">
            {hosts.map((host, i) => (
              <div
                key={host.id}
                className="relative"
                style={{ 
                  animation: 'float 2s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`
                }}
              >
                <div className="absolute inset-0 rounded-full blur-md opacity-50" style={{
                  background: 'rgba(235, 118, 31, 0.3)',
                  animation: 'pulse 2s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`
                }} />
                <div className="relative ring-4 ring-background transition-transform hover:scale-110" style={{
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                  }}>
                  <LottieAvatar
                    hostIndex={i}
                    size={96}
                    isAnimating={true}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Status message */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <span className="text-lg font-medium text-foreground">
                {stepMessages[generationStep] || 'Preparing your podcast...'}
              </span>
            </div>
          </div>
        </div>

        {/* Add keyframe animations */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={!!user}>
      <div className="min-h-screen flex w-full bg-background">
        {/* Sidebar - only show when signed in */}
        {user && <PodcastSidebar />}

        {/* Floating toggle when collapsed - only show when signed in */}
        {user && <SidebarToggleButton />}

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header />

          <main className="flex-1 max-w-5xl mx-auto w-full px-8 py-10">
            {/* Navigation bar */}
            <div className="flex items-center justify-end mb-10">
              <div className="flex items-center gap-3">
                <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Share Podcast Environment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* Share link */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Public Link</label>
                        <div className="flex gap-2">
                          <Input
                            readOnly
                            value={shareLink}
                            className="bg-secondary text-sm"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => copyToClipboard(shareLink, 'link')}
                            className="shrink-0"
                          >
                            {copied === 'link' ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Share code */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Code</label>
                        <div className="flex gap-2">
                          <div className="flex-1 h-10 px-4 rounded-md bg-secondary border border-border flex items-center justify-center">
                            <span className="text-xl font-mono tracking-widest">{shareCode}</span>
                          </div>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => copyToClipboard(shareCode, 'code')}
                            className="shrink-0"
                          >
                            {copied === 'code' ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Anyone with this link or code can access this podcast environment.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="space-y-12">
              {/* Host configuration - horizontal row */}
              <section>
                <StudioHostPanel hosts={hosts} onUpdateHost={updateHost} />
              </section>

              {/* Topic input with integrated document upload */}
              <section>
                <StudioTopicInput
                  prompt={prompt}
                  onPromptChange={setPrompt}
                  ragFiles={ragFiles}
                  onAddFile={addRagFile}
                  onRemoveFile={removeRagFile}
                  disabled={isGenerating}
                />
              </section>

              {/* Generate button */}
              <section className="max-w-md mx-auto space-y-4">
                <StudioGenerateButton
                  generationStep={generationStep}
                  disabled={!prompt?.trim()}
                  onGenerate={generate}
                />

                <div className="text-center">
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => navigate('/podcast')}
                  >
                    Go to Dev Tools (TTS Stream Test)
                  </Button>
                </div>
              </section>

              {/* AI Thinking animations */}
              {(generationStep === 'ingesting' || generationStep === 'extracting') && ragFiles.length > 0 && (
                <DocumentIngestionPreview
                  documents={ragFiles.map(f => ({ name: f.name, content: f.rawTextMock }))}
                  isActive={generationStep === 'ingesting' || generationStep === 'extracting'}
                />
              )}

              {(generationStep === 'assigning' || generationStep === 'outline') && (
                <BuildingOutlineCard
                  hosts={hosts}
                  isActive={generationStep === 'assigning' || generationStep === 'outline'}
                  topic={prompt}
                />
              )}

            </div>

          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
