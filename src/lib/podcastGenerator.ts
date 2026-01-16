import { HostConfig, PodcastSettings, RagChunk, GeneratedPodcast, LENGTH_OPTIONS } from '@/types/podcast';
import { retrieve } from './rag';
import type { RagFile } from '@/types/podcast';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GenerationParams {
  prompt: string;
  hosts: [HostConfig, HostConfig];
  settings: PodcastSettings;
  ragFiles: RagFile[];
}

export async function generatePodcast(params: GenerationParams): Promise<GeneratedPodcast> {
  const { prompt, hosts, settings, ragFiles } = params;
  
  // Retrieve RAG chunks if enabled
  let ragChunks: RagChunk[] = [];
  if (settings.useRag && ragFiles.length > 0) {
    const result = await retrieve(prompt, ragFiles, 5);
    ragChunks = result.chunks;
  }

  // Call the edge function to generate podcast with LLM
  const { data, error } = await supabase.functions.invoke('generate-podcast', {
    body: {
      prompt,
      hosts: hosts.map(h => ({ id: h.id, name: h.name, role: h.role })),
      settings,
      ragChunks,
    },
  });

  if (error) {
    console.error('Error calling generate-podcast:', error);
    toast.error('Failed to generate podcast. Please try again.');
    throw new Error(error.message || 'Failed to generate podcast');
  }

  if (data.error) {
    console.error('Podcast generation error:', data.error);
    toast.error(data.error);
    throw new Error(data.error);
  }

  // Convert createdAt back to Date object
  return {
    ...data,
    createdAt: new Date(data.createdAt),
  };
}
