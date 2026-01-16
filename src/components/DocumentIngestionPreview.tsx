import { useState, useEffect } from 'react';
import { FileText, Scan, Sparkles, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Document {
  name: string;
  content?: string;
}

interface DocumentIngestionPreviewProps {
  documents: Document[];
  isActive: boolean;
  onComplete?: () => void;
}

export function DocumentIngestionPreview({ documents, isActive, onComplete }: DocumentIngestionPreviewProps) {
  const [processingIndex, setProcessingIndex] = useState(-1);
  const [completedDocs, setCompletedDocs] = useState<Set<number>>(new Set());
  const [extractedConcepts, setExtractedConcepts] = useState<string[]>([]);

  // Mock concepts to extract
  const CONCEPTS_PER_DOC = [
    ['Machine Learning', 'Neural Networks', 'Data Preprocessing'],
    ['APIs', 'REST Architecture', 'Authentication'],
    ['Design Patterns', 'SOLID Principles', 'Clean Code'],
    ['Database Schema', 'SQL Queries', 'Indexing'],
  ];

  useEffect(() => {
    if (!isActive) {
      setProcessingIndex(-1);
      setCompletedDocs(new Set());
      setExtractedConcepts([]);
      return;
    }

    // Start processing documents
    let currentIdx = 0;
    
    const processNext = () => {
      if (currentIdx >= documents.length) {
        onComplete?.();
        return;
      }

      setProcessingIndex(currentIdx);

      // Extract concepts after a delay
      setTimeout(() => {
        const concepts = CONCEPTS_PER_DOC[currentIdx % CONCEPTS_PER_DOC.length];
        concepts.forEach((concept, i) => {
          setTimeout(() => {
            setExtractedConcepts((prev) => [...prev, concept]);
          }, i * 200);
        });
      }, 500);

      // Mark as complete and move to next
      setTimeout(() => {
        setCompletedDocs((prev) => new Set([...prev, currentIdx]));
        currentIdx++;
        setTimeout(processNext, 300);
      }, 1500);
    };

    const timeout = setTimeout(processNext, 500);
    return () => clearTimeout(timeout);
  }, [isActive, documents.length, onComplete]);

  if (!isActive || documents.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Scan className="w-4 h-4 text-primary animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-medium">Reading Course Materials</h3>
          <p className="text-xs text-muted-foreground">
            Analyzing {documents.length} document{documents.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Documents being processed */}
      <div className="space-y-2 mb-4">
        {documents.map((doc, idx) => (
          <div
            key={doc.name}
            className={cn(
              'flex items-center gap-3 p-2 rounded-md transition-all duration-300',
              processingIndex === idx && 'bg-primary/5 border border-primary/20',
              completedDocs.has(idx) && 'bg-muted/30'
            )}
          >
            <div className="relative">
              <FileText className={cn(
                'w-4 h-4 transition-colors',
                processingIndex === idx ? 'text-primary' : 'text-muted-foreground'
              )} />
              {processingIndex === idx && (
                <div className="absolute inset-0 animate-ping">
                  <FileText className="w-4 h-4 text-primary opacity-50" />
                </div>
              )}
            </div>
            
            <span className="text-xs flex-1 truncate">{doc.name}</span>
            
            {completedDocs.has(idx) && (
              <CheckCircle className="w-4 h-4 text-green-500 animate-scale-in" />
            )}
            
            {processingIndex === idx && (
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1 h-3 bg-primary rounded-full animate-ai-wave"
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Extracted concepts */}
      {extractedConcepts.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" />
            Extracted Concepts
          </p>
          <div className="flex flex-wrap gap-1.5">
            {extractedConcepts.map((concept, idx) => (
              <span
                key={`${concept}-${idx}`}
                className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20 animate-topic-appear"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
