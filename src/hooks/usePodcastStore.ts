import { useState, useEffect, useCallback } from 'react';
import { 
  HostConfig, 
  PodcastSettings, 
  RagFile, 
  GeneratedPodcast,
  GenerationStep,
  AVATAR_PRESETS
} from '@/types/podcast';
import { generatePodcast } from '@/lib/podcastGenerator';

const STORAGE_KEY = 'omnicast-state';

interface StoredState {
  hosts: HostConfig[];
  settings: PodcastSettings;
  ragFiles: RagFile[];
  lastPodcast: GeneratedPodcast | null;
}

const DEFAULT_HOSTS: HostConfig[] = [
  {
    id: 'host-a',
    name: 'Alex',
    voiceId: 'male-calm',
    voiceLabel: 'Male - Calm',
    role: 'Senior Engineer',
    avatarUrl: AVATAR_PRESETS[0].url,
    personality: 'analytical',
  },
  {
    id: 'host-b',
    name: 'Sam',
    voiceId: 'female-warm',
    voiceLabel: 'Female - Warm',
    role: 'Curious Learner',
    avatarUrl: AVATAR_PRESETS[1].url,
    personality: 'enthusiastic',
  },
  {
    id: 'host-c',
    name: 'Jordan',
    voiceId: 'british-crisp',
    voiceLabel: 'British - Crisp',
    role: 'Devil\'s Advocate',
    avatarUrl: AVATAR_PRESETS[2].url,
    personality: 'skeptical',
  },
];

const DEFAULT_SETTINGS: PodcastSettings = {
  length: 'medium',
  tone: 'casual',
  includeExamples: true,
  askQuestions: true,
  useRag: false,
};

interface PersistedState extends StoredState {
  prompt?: string;
}

function loadFromStorage(): PersistedState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Restore Date objects
      if (parsed.ragFiles) {
        parsed.ragFiles = parsed.ragFiles.map((f: RagFile) => ({
          ...f,
          uploadedAt: new Date(f.uploadedAt),
        }));
      }
      if (parsed.lastPodcast) {
        parsed.lastPodcast.createdAt = new Date(parsed.lastPodcast.createdAt);
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load from storage:', e);
  }
  return null;
}

function saveToStorage(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save to storage:', e);
  }
}

export function usePodcastStore() {
  // Use lazy initializers to load from storage immediately
  const [hosts, setHosts] = useState<HostConfig[]>(() => {
    const stored = loadFromStorage();
    return stored?.hosts && stored.hosts.length > 0 ? stored.hosts : DEFAULT_HOSTS;
  });
  const [settings, setSettings] = useState<PodcastSettings>(() => {
    const stored = loadFromStorage();
    return stored?.settings || DEFAULT_SETTINGS;
  });
  const [ragFiles, setRagFiles] = useState<RagFile[]>(() => {
    const stored = loadFromStorage();
    return stored?.ragFiles || [];
  });
  const [prompt, setPrompt] = useState<string>(() => {
    const stored = loadFromStorage();
    return typeof stored?.prompt === 'string' ? stored.prompt : '';
  });
  const [currentPodcast, setCurrentPodcast] = useState<GeneratedPodcast | null>(null);
  const [generationStep, setGenerationStep] = useState<GenerationStep>('idle');
  const [speakingHostId, setSpeakingHostId] = useState<string | null>(null);
  const [isPlaybackMode, setIsPlaybackMode] = useState(false);
  const [isViralClipsMode, setIsViralClipsMode] = useState(false);
  const [classroomContext, setClassroomContextState] = useState<{
    systemPrompt: string;
    documents: { name: string; content: string }[];
  } | null>(null);

  const setClassroomContext = useCallback((context: { systemPrompt: string; documents: { name: string; content: string }[] }) => {
    setClassroomContextState(context);
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    saveToStorage({
      hosts,
      settings,
      ragFiles,
      lastPodcast: currentPodcast,
      prompt,
    });
  }, [hosts, settings, ragFiles, currentPodcast, prompt]);

  const replaceHosts = useCallback((newHosts: HostConfig[]) => {
    setHosts(newHosts);
  }, []);

  const updateHost = useCallback((hostId: string, updates: Partial<HostConfig>) => {
    setHosts(prev => {
      const index = prev.findIndex(h => h.id === hostId);
      if (index === -1) return prev;
      const newHosts = [...prev];
      newHosts[index] = { ...newHosts[index], ...updates };
      return newHosts;
    });
  }, []);

  const updateSettings = useCallback((updates: Partial<PodcastSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const addRagFile = useCallback((file: File) => {
    const ragFile: RagFile = {
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      size: file.size,
      uploadedAt: new Date(),
      rawTextMock: `Mock extracted content from ${file.name}. This would contain the actual parsed text in a real implementation.`,
    };
    setRagFiles(prev => [...prev, ragFile]);
    
    // Enable RAG when first file is added
    if (ragFiles.length === 0) {
      setSettings(prev => ({ ...prev, useRag: true }));
    }
  }, [ragFiles.length]);

  const removeRagFile = useCallback((fileId: string) => {
    setRagFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const generate = useCallback(async () => {
    if (!prompt.trim()) return;

    // New AI thinking stages when documents/RAG are present
    const hasDocuments = ragFiles.length > 0 || (classroomContext?.documents?.length || 0) > 0;
    
    // Quick visual feedback phases
    if (hasDocuments) {
      setGenerationStep('ingesting');
      await new Promise(r => setTimeout(r, 1000));

      setGenerationStep('extracting');
      await new Promise(r => setTimeout(r, 1000));
    }

    setGenerationStep('assigning');
    await new Promise(r => setTimeout(r, 800));

    setGenerationStep('generating');
    // Short wait to simulate connecting to studio
    await new Promise(r => setTimeout(r, 1000));

    // Create a placeholder podcast object for the store
    // The actual content will be streamed in RealTimePlaybackView
    const podcast: GeneratedPodcast = {
      id: `podcast-${Date.now()}`,
      title: 'New Podcast Episode',
      prompt: prompt,
      transcript: [], // Will be filled by streaming
      ragChunks: [],
      createdAt: new Date(),
    };

    setCurrentPodcast(podcast);
    setGenerationStep('complete');
    setIsPlaybackMode(true);
    
    // Note: Old simulation loop removed. 
    // RealTimePlaybackView handles streaming and state.
  }, [prompt, hosts, settings, ragFiles, classroomContext]);

  const exitPlaybackMode = useCallback(() => {
    setIsPlaybackMode(false);
    setSpeakingHostId(null);
  }, []);

  const enterViralClipsMode = useCallback(() => {
    setIsPlaybackMode(false);
    setIsViralClipsMode(true);
  }, []);

  const exitViralClipsMode = useCallback(() => {
    setIsViralClipsMode(false);
  }, []);

  const backToPlayback = useCallback(() => {
    setIsViralClipsMode(false);
    setIsPlaybackMode(true);
  }, []);

  const resetGeneration = useCallback(() => {
    setGenerationStep('idle');
    setSpeakingHostId(null);
  }, []);

  return {
    // State
    hosts,
    settings,
    ragFiles,
    currentPodcast,
    generationStep,
    prompt,
    speakingHostId,
    isPlaybackMode,
    isViralClipsMode,
    classroomContext,
    
    // Actions
    setPrompt,
    replaceHosts,
    updateHost,
    updateSettings,
    addRagFile,
    removeRagFile,
    generate,
    resetGeneration,
    exitPlaybackMode,
    enterViralClipsMode,
    exitViralClipsMode,
    backToPlayback,
    setClassroomContext,
  };
}
