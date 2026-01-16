import { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, FileText, X } from 'lucide-react';
import { GenerationStep, RagFile } from '@/types/podcast';
import { cn } from '@/lib/utils';

const STEP_LABELS: Record<GenerationStep, string> = {
  idle: '',
  ingesting: 'Reading materials…',
  extracting: 'Extracting concepts…',
  assigning: 'Assigning viewpoints…',
  outline: 'Writing outline…',
  generating: 'Generating…',
  finalizing: 'Finalizing…',
  complete: 'Complete!',
};

interface PodcastPromptCardProps {
  prompt: string;
  generationStep: GenerationStep;
  ragFiles?: RagFile[];
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  onAddFile?: (file: File) => void;
  onRemoveFile?: (fileId: string) => void;
}

export function PodcastPromptCard({
  prompt,
  generationStep,
  ragFiles = [],
  onPromptChange,
  onGenerate,
  onAddFile,
  onRemoveFile,
}: PodcastPromptCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isGenerating = generationStep !== 'idle' && generationStep !== 'complete';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && onAddFile) {
      Array.from(files).forEach(file => onAddFile(file));
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isGenerating && prompt.trim()) {
        onGenerate();
      }
    }
  };

  return (
    <div className="space-y-4">
      <Textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter your podcast topic..."
        className={cn(
          "min-h-[180px] bg-transparent border border-dashed border-border rounded-lg",
          "resize-none text-sm placeholder:text-muted-foreground/50",
          "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted-foreground/50"
        )}
        disabled={isGenerating}
      />

      {/* Document Upload Section */}
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.md,.pptx"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isGenerating}
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isGenerating}
          className={cn(
            "w-full p-4 border-2 border-dashed rounded-lg transition-all",
            "flex flex-col items-center justify-center gap-2",
            "hover:border-primary/50 hover:bg-primary/5",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            ragFiles.length > 0 ? "border-primary/30 bg-primary/5" : "border-border"
          )}
        >
          <Upload className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Upload documents (PDF, Word, TXT, Markdown, PPTX)
          </span>
        </button>

        {/* File List */}
        {ragFiles.length > 0 && (
          <div className="space-y-2">
            {ragFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                {onRemoveFile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveFile(file.id)}
                    disabled={isGenerating}
                    className="h-8 w-8 p-0 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Button
        onClick={onGenerate}
        disabled={!prompt.trim() || isGenerating}
        className={cn(
          'w-full h-11 text-sm font-medium rounded-full',
          'bg-primary text-primary-foreground hover:bg-primary/90',
          'disabled:opacity-40 disabled:cursor-not-allowed'
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {STEP_LABELS[generationStep]}
          </>
        ) : (
          'Generate'
        )}
      </Button>
    </div>
  );
}