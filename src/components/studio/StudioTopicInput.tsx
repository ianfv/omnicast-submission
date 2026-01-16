import { useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Paperclip, FileText, X, ChevronDown } from 'lucide-react';
import { RagFile } from '@/types/podcast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import omnicastLogo from '@/assets/omnicast-icon.png';

interface StudioTopicInputProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  ragFiles: RagFile[];
  onAddFile: (file: File) => void;
  onRemoveFile: (fileId: string) => void;
  disabled?: boolean;
}

export function StudioTopicInput({ 
  prompt, 
  onPromptChange, 
  ragFiles,
  onAddFile,
  onRemoveFile,
  disabled 
}: StudioTopicInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showFiles, setShowFiles] = useState(ragFiles.length > 0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => onAddFile(file));
      setShowFiles(true);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
          <img src={omnicastLogo} alt="Omnicast" className="w-5 h-5 object-contain" />
        </div>
        <div>
          <Label className="text-sm font-semibold text-foreground">Episode Topic</Label>
          <p className="text-xs text-muted-foreground">Describe what the hosts should discuss</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.md,.pptx"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Topic textarea with integrated file attachment */}
      <div className={cn(
        'rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm',
        'transition-all duration-200',
        'focus-within:border-muted-foreground/50 focus-within:bg-card/50'
      )}>
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="e.g., The future of AI in education, focusing on personalized learning and assessment automation..."
          className={cn(
            'min-h-[120px] bg-transparent border-0 rounded-t-xl rounded-b-none',
            'resize-none text-sm placeholder:text-muted-foreground/40',
            'focus-visible:ring-0 focus-visible:ring-offset-0'
          )}
          disabled={disabled}
        />
        
        {/* Bottom toolbar */}
        <div className="px-3 py-2 border-t border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="h-8 px-3 text-muted-foreground hover:text-foreground gap-2"
            >
              <Paperclip className="w-4 h-4" />
              <span className="text-xs">Add reference</span>
            </Button>
            
            {ragFiles.length > 0 && (
              <button
                onClick={() => setShowFiles(!showFiles)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {ragFiles.length} file{ragFiles.length !== 1 ? 's' : ''}
                </span>
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 transition-transform",
                  showFiles && "rotate-180"
                )} />
              </button>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground/50">
            PDF, Word, TXT, Markdown
          </p>
        </div>

        {/* Collapsible file list */}
        {showFiles && ragFiles.length > 0 && (
          <div className="px-3 pb-3 space-y-2 animate-fade-in">
            {ragFiles.map((file) => (
              <div
                key={file.id}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded-lg',
                  'bg-muted/30 border border-border/30'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-3.5 h-3.5 text-primary/70" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFile(file.id)}
                  disabled={disabled}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}