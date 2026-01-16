import { useState, useEffect, useRef } from 'react';
import { FileText, Brain, Sparkles, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HostConfig } from '@/types/podcast';

interface Document {
  name: string;
  content?: string;
}

interface ExtractedTopic {
  id: string;
  label: string;
  hostId: string;
  delay: number;
}

interface AIThinkingOverlayProps {
  documents: Document[];
  hosts: HostConfig[];
  stage: 'reading' | 'extracting' | 'assigning' | 'outline' | 'done';
  onComplete?: () => void;
}

// Mock topics extracted from documents
const MOCK_TOPICS = [
  'Core Concepts',
  'Key Definitions',
  'Historical Context',
  'Practical Applications',
  'Common Misconceptions',
  'Advanced Techniques',
  'Case Studies',
  'Best Practices',
];

export function AIThinkingOverlay({ documents, hosts, stage, onComplete }: AIThinkingOverlayProps) {
  const [scanLinePosition, setScanLinePosition] = useState(0);
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [extractedTopics, setExtractedTopics] = useState<ExtractedTopic[]>([]);
  const [connectedTopics, setConnectedTopics] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Animate scan line
  useEffect(() => {
    if (stage !== 'reading') return;
    
    const interval = setInterval(() => {
      setScanLinePosition((prev) => {
        if (prev >= 100) {
          setActiveDocIndex((docIdx) => {
            const next = docIdx + 1;
            if (next >= documents.length) {
              return 0;
            }
            return next;
          });
          return 0;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [stage, documents.length]);

  // Extract topics animation
  useEffect(() => {
    if (stage !== 'extracting') {
      setExtractedTopics([]);
      return;
    }

    const topics: ExtractedTopic[] = MOCK_TOPICS.slice(0, Math.min(6, MOCK_TOPICS.length)).map((label, idx) => ({
      id: `topic-${idx}`,
      label,
      hostId: hosts[idx % hosts.length]?.id || 'host-a',
      delay: idx * 400,
    }));

    // Stagger appearance
    topics.forEach((topic, idx) => {
      setTimeout(() => {
        setExtractedTopics((prev) => [...prev, topic]);
      }, idx * 400);
    });

    return () => setExtractedTopics([]);
  }, [stage, hosts]);

  // Connect topics to hosts
  useEffect(() => {
    if (stage !== 'assigning') {
      setConnectedTopics(new Set());
      return;
    }

    extractedTopics.forEach((topic, idx) => {
      setTimeout(() => {
        setConnectedTopics((prev) => new Set([...prev, topic.id]));
      }, idx * 300);
    });

    // Complete after all connections
    if (onComplete) {
      const timeout = setTimeout(onComplete, extractedTopics.length * 300 + 1000);
      return () => clearTimeout(timeout);
    }
  }, [stage, extractedTopics, onComplete]);

  if (stage === 'done') return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center"
    >
      <div className="max-w-4xl w-full px-6">
        {/* Stage indicator */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            {stage === 'reading' && <FileText className="w-4 h-4 text-primary animate-pulse" />}
            {stage === 'extracting' && <Brain className="w-4 h-4 text-primary animate-pulse" />}
            {stage === 'assigning' && <Link2 className="w-4 h-4 text-primary animate-pulse" />}
            {stage === 'outline' && <Sparkles className="w-4 h-4 text-primary animate-pulse" />}
            <span className="text-sm font-medium text-primary">
              {stage === 'reading' && 'Reading course materials...'}
              {stage === 'extracting' && 'Extracting key concepts...'}
              {stage === 'assigning' && 'Assigning viewpoints to hosts...'}
              {stage === 'outline' && 'Building episode outline...'}
            </span>
          </div>
        </div>

        {/* Reading stage - Document scanning */}
        {stage === 'reading' && documents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc, idx) => (
              <div
                key={doc.name}
                className={cn(
                  'relative rounded-lg border overflow-hidden transition-all duration-300',
                  idx === activeDocIndex 
                    ? 'border-primary bg-primary/5 scale-[1.02]' 
                    : 'border-border bg-card opacity-50'
                )}
              >
                {/* Document header */}
                <div className="p-3 border-b border-border/50 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium truncate">{doc.name}</span>
                </div>

                {/* Fake document content with scan effect */}
                <div className="relative p-3 h-32 overflow-hidden">
                  {/* Fake text lines */}
                  <div className="space-y-2">
                    {[...Array(6)].map((_, lineIdx) => (
                      <div
                        key={lineIdx}
                        className="h-2 bg-muted/40 rounded"
                        style={{ width: `${60 + Math.random() * 40}%` }}
                      />
                    ))}
                  </div>

                  {/* Scan line */}
                  {idx === activeDocIndex && (
                    <div
                      className="absolute left-0 right-0 h-8 bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20 pointer-events-none animate-ai-scan-glow"
                      style={{ top: `${scanLinePosition}%` }}
                    >
                      <div className="absolute inset-x-0 top-1/2 h-px bg-primary" />
                    </div>
                  )}

                  {/* Scanned overlay */}
                  {idx < activeDocIndex && (
                    <div className="absolute inset-0 bg-primary/5 flex items-center justify-center">
                      <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                        ✓ Analyzed
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Extracting stage - Floating topic pills */}
        {stage === 'extracting' && (
          <div className="relative h-64">
            {/* Central brain icon */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <Brain className="w-16 h-16 text-primary animate-pulse" />
                <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full animate-ai-glow" />
              </div>
            </div>

            {/* Floating topics */}
            {extractedTopics.map((topic, idx) => {
              const angle = (idx / 6) * Math.PI * 2 - Math.PI / 2;
              const radius = 140;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <div
                  key={topic.id}
                  className="absolute top-1/2 left-1/2 animate-topic-appear"
                  style={{
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                    animationDelay: `${topic.delay}ms`,
                  }}
                >
                  <div className="px-3 py-1.5 rounded-full bg-secondary border border-border text-xs font-medium whitespace-nowrap animate-float">
                    <Sparkles className="w-3 h-3 inline mr-1.5 text-primary" />
                    {topic.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Assigning stage - Topics connected to hosts */}
        {stage === 'assigning' && (
          <div className="relative">
            {/* Hosts row */}
            <div className="flex justify-center gap-8 mb-12">
              {hosts.slice(0, 3).map((host, idx) => (
                <div key={host.id} className="text-center">
                  <div className="relative">
                    <div className={cn(
                      'w-16 h-16 rounded-full border-2 overflow-hidden transition-all duration-300',
                      connectedTopics.size > 0 ? 'border-primary scale-110' : 'border-muted'
                    )}>
                      {host.avatarUrl ? (
                        <img src={host.avatarUrl} alt={host.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-lg font-bold">
                          {host.name[0]}
                        </div>
                      )}
                    </div>
                    {/* Glow when receiving topics */}
                    {extractedTopics.some(t => connectedTopics.has(t.id) && t.hostId === host.id) && (
                      <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs font-medium mt-2">{host.name}</p>
                  <p className="text-xs text-muted-foreground">{host.role}</p>
                </div>
              ))}
            </div>

            {/* Topics flying to hosts */}
            <div className="flex flex-wrap justify-center gap-3">
              {extractedTopics.map((topic) => {
                const hostIdx = hosts.findIndex(h => h.id === topic.hostId);
                const isConnected = connectedTopics.has(topic.id);
                const hostColor = hostIdx === 0 ? 'cyan' : hostIdx === 1 ? 'violet' : 'amber';

                return (
                  <div
                    key={topic.id}
                    className={cn(
                      'px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-500',
                      isConnected
                        ? `bg-${hostColor}-500/20 border-${hostColor}-500/50 text-${hostColor}-400`
                        : 'bg-secondary border-border text-muted-foreground'
                    )}
                    style={{
                      transform: isConnected ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    {isConnected && (
                      <span className="inline-block w-2 h-2 rounded-full mr-2 animate-pulse"
                        style={{
                          backgroundColor: hostIdx === 0 ? '#22d3ee' : hostIdx === 1 ? '#a78bfa' : '#fbbf24'
                        }}
                      />
                    )}
                    {topic.label}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Outline stage */}
        {stage === 'outline' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Sparkles className="w-10 h-10 text-primary mx-auto animate-pulse" />
            </div>
            
            {/* Fake outline items appearing */}
            {['Introduction', 'Main Discussion Points', 'Key Insights', 'Conclusion'].map((item, idx) => (
              <div
                key={item}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card animate-outline-appear"
                style={{ animationDelay: `${idx * 200}ms` }}
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {idx + 1}
                </div>
                <span className="text-sm font-medium">{item}</span>
                <div className="flex-1 h-px bg-border" />
                <div className="flex -space-x-2">
                  {hosts.slice(0, 2).map((host) => (
                    <div key={host.id} className="w-5 h-5 rounded-full border border-background overflow-hidden">
                      {host.avatarUrl ? (
                        <img src={host.avatarUrl} alt={host.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted text-[8px] flex items-center justify-center">
                          {host.name[0]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-8">
          {['reading', 'extracting', 'assigning', 'outline'].map((s, idx) => (
            <div
              key={s}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                s === stage 
                  ? 'bg-primary w-6' 
                  : ['reading', 'extracting', 'assigning', 'outline'].indexOf(stage) > idx
                    ? 'bg-primary'
                    : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
