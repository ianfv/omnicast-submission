import { useRef } from 'react';
import { FileText, Upload, X, FolderOpen } from 'lucide-react';
import { RagFile } from '@/types/podcast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StudioDocumentUploadProps {
  ragFiles: RagFile[];
  onAddFile: (file: File) => void;
  onRemoveFile: (fileId: string) => void;
  disabled?: boolean;
}

export function StudioDocumentUpload({
  ragFiles,
  onAddFile,
  onRemoveFile,
  disabled,
}: StudioDocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => onAddFile(file));
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
          <FolderOpen className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Reference Materials</p>
          <p className="text-xs text-muted-foreground">Optional context for smarter conversations</p>
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

      {/* Drop zone */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className={cn(
          'w-full p-6 rounded-xl border-2 border-dashed transition-all duration-200',
          'flex flex-col items-center justify-center gap-3',
          'bg-transparent',
          'hover:border-muted-foreground/40 hover:bg-muted/10',
          'focus:outline-none focus:border-muted-foreground/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          ragFiles.length > 0 
            ? 'border-primary/20 bg-primary/5' 
            : 'border-border/50'
        )}
      >
        <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
          <Upload className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Drop files or click to upload
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            PDF, Word, TXT, Markdown, PowerPoint
          </p>
        </div>
      </button>

      {/* File list */}
      {ragFiles.length > 0 && (
        <div className="space-y-2">
          {ragFiles.map((file) => (
            <div
              key={file.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg',
                'bg-muted/30 border border-border/30'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-primary/70" />
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
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
