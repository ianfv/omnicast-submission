import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Users, FileText, MessageSquare, Palette, Check, Play, Pencil, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { HostConfig, AVATAR_PRESETS_BY_CATEGORY, VOICE_OPTIONS, ROLE_OPTIONS, PERSONALITY_TRAITS } from '@/types/podcast';
import { usePodcastStore } from '@/hooks/usePodcastStore';
import { useAuthContext } from '@/contexts/AuthContext';
import omnicastLogo from '@/assets/omnicast-icon.png';
import { motion, AnimatePresence } from 'framer-motion';
import { LottieAvatar } from '@/components/LottieAvatar';
type SetupStep = 'documents' | 'topic' | 'customize' | 'summary';
const STEPS: {
  id: SetupStep;
  label: string;
  icon: React.ElementType;
}[] = [{
  id: 'documents',
  label: 'Documents',
  icon: FileText
}, {
  id: 'topic',
  label: 'Topic',
  icon: MessageSquare
}, {
  id: 'customize',
  label: 'Customize',
  icon: Palette
}, {
  id: 'summary',
  label: 'Review',
  icon: Play
}];
const DEFAULT_HOSTS: HostConfig[] = [{
  id: 'host-1',
  name: 'Alex',
  voiceId: 'male-calm',
  voiceLabel: 'Male - Calm',
  role: 'Curious Learner',
  avatarUrl: AVATAR_PRESETS_BY_CATEGORY.professional[0].url,
  personality: 'enthusiastic'
}, {
  id: 'host-2',
  name: 'Emma',
  voiceId: 'female-warm',
  voiceLabel: 'Female - Warm',
  role: 'Industry Expert',
  avatarUrl: AVATAR_PRESETS_BY_CATEGORY.professional[1].url,
  personality: 'analytical'
}];
export default function PodcastSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    user
  } = useAuthContext();
  const {
    setPrompt,
    replaceHosts,
    addRagFile,
    prompt: storedPrompt,
    hosts: storedHosts,
    ragFiles: storedRagFiles
  } = usePodcastStore();
  
  // Check if we should start at summary step (coming back from demo)
  const initialStep = searchParams.get('step') === 'summary' ? 'summary' : 'documents';
  
  const [currentStep, setCurrentStep] = useState<SetupStep>(initialStep);
  const [hostCount, setHostCount] = useState(storedHosts.length || 2);
  const [hosts, setHosts] = useState<HostConfig[]>(storedHosts.length > 0 ? storedHosts : DEFAULT_HOSTS);
  const [uploadedFiles, setUploadedFiles] = useState<{
    file: File;
    id: string;
  }[]>([]);
  const [topic, setTopic] = useState(storedPrompt || '');
  const [editingHostIndex, setEditingHostIndex] = useState<number | null>(null);
  const [isEditingFromSummary, setIsEditingFromSummary] = useState(false);
  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;
  const handleNext = () => {
    // If editing from summary, return to summary
    if (isEditingFromSummary) {
      setIsEditingFromSummary(false);
      setCurrentStep('summary');
      return;
    }
    
    if (currentStep === 'customize') {
      // Moving to summary - save to store first
      const selectedHosts = hosts.slice(0, hostCount);
      replaceHosts(selectedHosts);
      setPrompt(topic);
      uploadedFiles.forEach(({
        file
      }) => addRagFile(file));
      setCurrentStep('summary');
    } else if (!isLastStep) {
      setCurrentStep(STEPS[currentStepIndex + 1].id);
    }
  };
  const handleGenerate = () => {
    // Navigate to demo page with autostart flag to begin generation immediately
    navigate('/demo-studio?autostart=true');
  };
  const jumpToStep = (step: SetupStep) => {
    // Allow jumping back to edit from summary
    setIsEditingFromSummary(true);
    setCurrentStep(step);
  };
  const handleBack = () => {
    // If editing from summary, cancel and return to summary
    if (isEditingFromSummary) {
      setIsEditingFromSummary(false);
      setCurrentStep('summary');
      return;
    }
    
    if (!isFirstStep) {
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  };
  const handleHostCountChange = (count: number) => {
    setHostCount(count);
    // Add more hosts if needed
    while (hosts.length < count) {
      const newIndex = hosts.length;
      const avatarCategory = newIndex % 2 === 0 ? 'professional' : 'casual';
      // Special name for third host
      const hostName = newIndex === 2 ? 'Sam' : `Host ${newIndex + 1}`;
      hosts.push({
        id: `host-${newIndex + 1}`,
        name: hostName,
        voiceId: newIndex % 2 === 0 ? 'male-calm' : 'female-warm',
        voiceLabel: newIndex % 2 === 0 ? 'Male - Calm' : 'Female - Warm',
        role: 'Curious Learner',
        avatarUrl: AVATAR_PRESETS_BY_CATEGORY[avatarCategory][newIndex % 5].url,
        personality: 'enthusiastic'
      });
    }
    setHosts([...hosts]);
  };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setUploadedFiles(prev => [...prev, {
        file,
        id
      }]);
    });
    e.target.value = '';
  };
  const removeDocument = (id: string) => {
    setUploadedFiles(prev => prev.filter(d => d.id !== id));
  };
  const updateHostField = (index: number, updates: Partial<HostConfig>) => {
    const newHosts = [...hosts];
    newHosts[index] = {
      ...newHosts[index],
      ...updates
    };
    setHosts(newHosts);
  };
  const canProceed = () => {
    switch (currentStep) {
      case 'documents':
        return true;
      // Optional
      case 'topic':
        return topic.trim().length > 0;
      case 'customize':
        return true;
      case 'summary':
        return true;
      default:
        return false;
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center justify-center border-b border-border/30 backdrop-blur-xl bg-background/50 relative">
        <Link to={user ? '/dashboard' : '/'} className="absolute left-6 flex items-center gap-2 hover:opacity-80 transition-opacity group">
          <img src={omnicastLogo} alt="Omnicast" className="w-8 h-8 object-contain group-hover:scale-105 transition-transform" />
          <span className="tracking-tight text-xl font-semibold">Omnicast</span>
        </Link>
        
        {/* Progress indicator - centered */}
        <div className="flex items-center gap-2">
          {STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isComplete = index < currentStepIndex;
          const Icon = step.icon;
          return <div key={step.id} className="flex items-center">
                <div className={cn('relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300', isActive && 'text-white shadow-lg scale-110', isComplete && 'text-[#eb761f]', !isActive && !isComplete && 'bg-muted/50 text-muted-foreground')} style={isActive ? {
            backgroundColor: '#eb761f',
            boxShadow: '0 10px 15px -3px rgba(235, 118, 31, 0.3)'
          } : isComplete ? {
            backgroundColor: 'rgba(235, 118, 31, 0.2)'
          } : {}}>
                  {isActive && <div className="absolute inset-0 rounded-full animate-ping" style={{
            backgroundColor: 'rgba(235, 118, 31, 0.2)'
          }} />}
                  {isComplete ? <Check className="w-4 h-4 relative" /> : <Icon className="w-4 h-4 relative" />}
                </div>
                {index < STEPS.length - 1 && <div className={cn('w-12 h-0.5 mx-1 transition-all duration-300 rounded-full', index < currentStepIndex ? '' : 'bg-border/50')} style={index < currentStepIndex ? {
            background: 'linear-gradient(to right, #eb761f, rgba(235, 118, 31, 0.5))'
          } : {}} />}
              </div>;
        })}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">

          {/* Step: Documents */}
          {currentStep === 'documents' && <div className="text-center space-y-8 animate-fade-in">
              <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl font-light tracking-tight">
                  Add your documents
                </h1>
                <p className="text-muted-foreground">
                  Upload PDFs, notes, or slides to ground the conversation
                </p>
              </div>
              
              <div className="space-y-4">
                <label className={cn('block w-full p-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer')} style={{
            borderColor: 'rgba(235, 118, 31, 0.5)',
            backgroundColor: 'rgba(235, 118, 31, 0.05)'
          }} onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(235, 118, 31, 0.6)';
            e.currentTarget.style.backgroundColor = 'rgba(235, 118, 31, 0.1)';
          }} onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(235, 118, 31, 0.5)';
            e.currentTarget.style.backgroundColor = 'rgba(235, 118, 31, 0.05)';
          }}>
                  <input type="file" multiple accept=".pdf,.txt,.md,.docx" onChange={handleFileUpload} className="hidden" />
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{
              backgroundColor: 'rgba(235, 118, 31, 0.1)'
            }}>
                      <FileText className="w-6 h-6" style={{
              color: '#eb761f'
            }} />
                    </div>
                    <div>
                      <p className="font-medium">Drop files here or click to upload</p>
                      <p className="text-sm text-muted-foreground mt-1">PDF, TXT, MD, DOCX</p>
                    </div>
                  </div>
                </label>
                
                {uploadedFiles.length > 0 && <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-left">
                    {uploadedFiles.map(({
                file,
                id
              }) => <div key={id} className="group relative p-3 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border-2 border-[rgba(235,118,31,0.5)] hover:border-[rgba(235,118,31,0.8)] transition-all duration-300 hover:shadow-lg hover:shadow-[rgba(235,118,31,0.1)]">
                        <div className="flex flex-col items-center text-center gap-2">
                          {/* Document Icon */}
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-[rgba(235,118,31,0.15)] to-[rgba(235,118,31,0.05)] group-hover:from-[rgba(235,118,31,0.2)] group-hover:to-[rgba(235,118,31,0.1)] transition-all duration-300">
                            <FileText className="w-6 h-6" style={{ color: '#eb761f' }} />
                          </div>
                          
                          {/* File Name */}
                          <div className="w-full">
                            <p className="text-xs font-medium text-foreground break-all line-clamp-2 leading-relaxed">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        
                        {/* Remove Button */}
                        <button 
                          onClick={() => removeDocument(id)} 
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 hover:bg-destructive/90 border border-border/50 hover:border-destructive flex items-center justify-center text-muted-foreground hover:text-destructive-foreground transition-all duration-200 opacity-0 group-hover:opacity-100"
                          aria-label="Remove document"
                        >
                          <span className="text-base leading-none">×</span>
                        </button>
                      </div>)}
                  </div>}
              </div>
            </div>}

          {/* Step: Topic */}
          {currentStep === 'topic' && <div className="text-center space-y-8 animate-fade-in">
              <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl font-light tracking-tight">
                  What do you want to learn about?
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Don't worry — you can interact with the podcast live and change the direction anytime
                </p>
              </div>
              
              <div className="space-y-4">
                <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Explain quantum computing to me like I'm a software engineer..." className={cn('w-full h-32 p-4 rounded-2xl resize-none', 'bg-muted/20 border border-white', 'focus:outline-none focus:border-white', 'placeholder:text-muted-foreground/50', 'transition-all duration-300')} />
              </div>
            </div>}

          {/* Step: Customize Hosts */}
          {currentStep === 'customize' && <div className="space-y-8 animate-fade-in">
              <div className="text-center space-y-3">
                <h1 className="text-3xl md:text-4xl font-light tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Customize your hosts
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Personalize each host's appearance and personality
                </p>
              </div>

              {/* Host Count Selector */}
              <div className="space-y-5">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">How many hosts?</p>
                </div>
                <div className="flex justify-center gap-4">
                  {[1, 2, 3].map(count => <button key={count} onClick={() => handleHostCountChange(count)} className={cn('relative w-24 h-24 rounded-xl border-2 transition-all duration-300 ease-out', 'flex flex-col items-center justify-center gap-1', 'hover:scale-105 active:scale-95', hostCount === count ? 'text-foreground' : 'border-border/50 bg-background text-muted-foreground hover:border-border hover:bg-muted/20')} style={hostCount === count ? {
              borderColor: '#eb761f',
              backgroundColor: 'rgba(235, 118, 31, 0.05)'
            } : {}}>
                      <span className="text-3xl font-light">{count}</span>
                      <span className="text-[10px] uppercase tracking-wider font-medium opacity-70">{count === 1 ? 'Host' : 'Hosts'}</span>
                    </button>)}
                </div>
              </div>
              
              <div className="flex flex-col gap-4 min-h-[400px]">
                <AnimatePresence mode="sync">
                  {hosts.slice(0, hostCount).map((host, index) => <motion.div key={host.id} initial={{
                opacity: 0,
                scale: 0.8
              }} animate={{
                opacity: 1,
                scale: 1
              }} exit={{
                opacity: 0,
                scale: 0.8
              }} transition={{
                duration: 0.4,
                delay: index * 0.08,
                ease: [0.4, 0, 0.2, 1]
              }} className={cn('rounded-2xl border transition-all duration-300 overflow-hidden w-full', editingHostIndex === index ? 'shadow-lg' : 'border-border/50 bg-card/50 backdrop-blur-sm hover:border-border hover:shadow-md')} style={editingHostIndex === index ? {
            borderColor: 'rgba(235, 118, 31, 0.5)',
            backgroundColor: 'rgba(235, 118, 31, 0.05)',
            boxShadow: '0 10px 15px -3px rgba(235, 118, 31, 0.1)'
          } : {}}>
                      {editingHostIndex === index ?
                // Editing mode
                <div className="p-5 space-y-4">
                        <div className="flex items-center gap-4">
                          <LottieAvatar 
                            hostIndex={index} 
                            size={96} 
                            isAnimating={false}
                          />
                          <input value={host.name} onChange={e => updateHostField(index, {
                    name: e.target.value
                  })} className="flex-1 bg-transparent border-b border-border outline-none text-lg font-medium py-1 transition-colors" onFocus={e => e.currentTarget.style.borderColor = '#eb761f'} onBlur={e => e.currentTarget.style.borderColor = ''} />
                          <Button variant="ghost" size="sm" onClick={() => setEditingHostIndex(null)} className="shrink-0 text-muted-foreground hover:text-foreground">
                            Done
                          </Button>
                        </div>
                        
                        {/* Voice & Role */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Voice</Label>
                            <Select value={host.voiceId} onValueChange={value => {
                    const voice = VOICE_OPTIONS.find(v => v.id === value);
                    updateHostField(index, {
                      voiceId: value,
                      voiceLabel: voice?.label || value
                    });
                  }}>
                              <SelectTrigger className="bg-muted/30 border-border/50 rounded-xl h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {VOICE_OPTIONS.map(voice => <SelectItem key={voice.id} value={voice.id}>{voice.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Role</Label>
                            <Select value={host.role} onValueChange={value => updateHostField(index, {
                    role: value
                  })}>
                              <SelectTrigger className="bg-muted/30 border-border/50 rounded-xl h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.map(role => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {/* Personality */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Personality</Label>
                          <div className="flex gap-2 flex-wrap">
                            {PERSONALITY_TRAITS.map(trait => <button key={trait.value} onClick={() => updateHostField(index, {
                    personality: trait.value
                  })} className={cn('px-3 py-1.5 rounded-full text-sm transition-all duration-300', host.personality === trait.value ? 'text-white shadow-sm' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground')} style={host.personality === trait.value ? {
                    backgroundColor: '#eb761f'
                  } : {}}>
                                {trait.label}
                              </button>)}
                          </div>
                        </div>
                      </div> :
              // Display mode - Show host info
              <button onClick={() => setEditingHostIndex(index)} className="w-full p-5 flex items-center gap-4 text-left group">
                        <div className="relative">
                          <LottieAvatar 
                            hostIndex={index} 
                            size={96} 
                            isAnimating={false}
                            className="ring-2 ring-border/30 transition-all duration-300"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-base mb-0.5">{host.name}</h3>
                          <p className="text-sm text-muted-foreground mb-1">{host.role}</p>
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{
                    backgroundColor: 'rgba(235, 118, 31, 0.5)'
                  }} />
                            <span className="text-xs text-muted-foreground/70">{host.voiceLabel}</span>
                            <span className="text-xs text-muted-foreground/50 mx-1">•</span>
                            <span className="text-xs text-muted-foreground/70 capitalize">{host.personality}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground/50 transition-colors group-hover:text-[rgba(235,118,31,0.7)]">
                          Click to edit
                        </div>
                      </button>}
                    </motion.div>)}
                </AnimatePresence>
              </div>
            </div>}

          {/* Step: Summary */}
          {currentStep === 'summary' && <div className="space-y-8 animate-fade-in">
              <div className="text-center space-y-3">
               
                <h1 className="text-3xl md:text-4xl font-light tracking-tight">
                  Ready to generate
                </h1>
                <p className="text-muted-foreground">
                  Review your settings and start your podcast
                </p>
              </div>
              
              {/* Summary Cards */}
              <div className="space-y-4">
                {/* Topic Card */}
                <div className="p-5 rounded-2xl border border-border/50 bg-muted/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Episode Topic</span>
                      </div>
                      <p className="text-foreground line-clamp-3">{topic || 'No topic set'}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => jumpToStep('topic')} className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                  </div>
                </div>

                {/* Hosts Card */}
                <div className="p-5 rounded-2xl border border-border/50 bg-muted/10">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{hostCount} {hostCount === 1 ? 'Host' : 'Hosts'}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => jumpToStep('customize')} className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {hosts.slice(0, hostCount).map((host, index) => <div key={host.id} className="flex items-center gap-3 px-4 py-2 rounded-xl bg-background/50 border border-border/30">
                        <LottieAvatar
                          hostIndex={index}
                          size={64}
                          isAnimating={false}
                          className="ring-2 ring-border/50"
                        />
                        <div>
                          <p className="font-medium text-sm">{host.name}</p>
                          <p className="text-xs text-muted-foreground">{host.role}</p>
                        </div>
                      </div>)}
                  </div>
                </div>

                {/* Documents Card */}
                <div className="p-5 rounded-2xl border border-border/50 bg-muted/10">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span>Source Documents</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => jumpToStep('documents')} className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                  </div>
                  {uploadedFiles.length > 0 ? <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {uploadedFiles.map(({
                    file,
                    id
                  }) => <div key={id} className="group relative p-2 rounded-lg bg-gradient-to-br from-muted/40 to-muted/20 border-2 border-[rgba(235,118,31,0.5)] hover:border-[rgba(235,118,31,0.8)] transition-all duration-300">
                          <div className="flex flex-col items-center text-center gap-1.5">
                            {/* Document Icon */}
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[rgba(235,118,31,0.15)] to-[rgba(235,118,31,0.05)] group-hover:from-[rgba(235,118,31,0.2)] group-hover:to-[rgba(235,118,31,0.1)] transition-all duration-300">
                              <FileText className="w-4 h-4" style={{ color: '#eb761f' }} />
                            </div>
                            
                            {/* File Name */}
                            <div className="w-full">
                              <p className="text-[10px] font-medium text-foreground break-all line-clamp-2 leading-tight">
                                {file.name}
                              </p>
                            </div>
                          </div>
                        </div>)}
                    </div> : <p className="text-muted-foreground text-sm">No documents uploaded</p>}
                </div>
              </div>

              {/* Generate Button */}
              <Button onClick={handleGenerate} size="lg" className="w-full h-14 rounded-full text-lg gap-3 text-white shadow-lg transition-all" style={{
            background: 'linear-gradient(to right, #eb761f, rgba(235, 118, 31, 0.8))',
            boxShadow: '0 10px 15px -3px rgba(235, 118, 31, 0.25)'
          }} onMouseEnter={e => {
            e.currentTarget.style.background = 'linear-gradient(to right, rgba(235, 118, 31, 0.9), rgba(235, 118, 31, 0.7))';
          }} onMouseLeave={e => {
            e.currentTarget.style.background = 'linear-gradient(to right, #eb761f, rgba(235, 118, 31, 0.8))';
          }}>
                <Play className="w-5 h-5 fill-current" />
                Generate Podcast
              </Button>
            </div>}
        </div>
      </main>

      {/* Footer with navigation - hide on summary step */}
      {currentStep !== 'summary' && <footer className="p-6 border-t border-border/30 backdrop-blur-xl bg-background/50">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Button variant="ghost" onClick={handleBack} className={cn('gap-2 rounded-full hover:bg-muted/50 transition-all', (isFirstStep && !isEditingFromSummary) && 'opacity-0 pointer-events-none')}>
              
              {isEditingFromSummary ? 'Cancel' : 'Back'}
            </Button>
            
            {!isEditingFromSummary && <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 border border-border/30">
              <div className="text-sm font-medium text-foreground">
                {currentStepIndex + 1}
              </div>
              <div className="text-sm text-muted-foreground">
                of {STEPS.length}
              </div>
            </div>}
            
            <Button onClick={handleNext} disabled={!canProceed()} className={cn('gap-2 rounded-full px-6 shadow-lg transition-all')} style={canProceed() ? {
            boxShadow: '0 10px 15px -3px rgba(235, 118, 31, 0.2)'
          } : {}} onMouseEnter={e => {
            if (canProceed()) {
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(235, 118, 31, 0.3)';
            }
          }} onMouseLeave={e => {
            if (canProceed()) {
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(235, 118, 31, 0.2)';
            }
          }}>
              {isEditingFromSummary ? 'Finish' : currentStep === 'customize' ? 'Review' : 'Next'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </footer>}
    </div>;
}