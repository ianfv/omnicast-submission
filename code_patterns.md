## Pattern Examples: API Patterns

### Pattern 1: Supabase Client Initialization

**Found in**: `src/integrations/supabase/client.ts:1-17`
**Used for**: Global access to Supabase instance

```typescript
// Singleton Supabase client
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
```

**Key aspects**:

- Singleton pattern
- Typed with Database schema
- Environment variable configuration
- Custom auth persistence config

### Pattern 2: Edge Function Invocation (Manual Fetch)

**Found in**: `src/hooks/useTTS.ts:85-117`
**Used for**: Calling Supabase Edge Functions with custom headers and error handling

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  },
  body: JSON.stringify({
    text,
    voiceId,
    // ...
  }),
});

if (!response.ok) {
  const errorData = await response.json();
  if (response.status === 429) {
    // Handle rate limiting
    return;
  }
  throw new Error(errorData.error || `TTS request failed: ${response.status}`);
}
```

**Key aspects**:

- Uses native `fetch` instead of `supabase.functions.invoke`
- Manually constructs headers (apikey, Authorization)
- Custom error parsing and 429 handling

## Pattern Examples: Data Patterns

### Pattern 1: Component-Level Data Fetching

**Found in**: `src/pages/DashboardPage.tsx:22-41`
**Used for**: Fetching page-specific data on mount or dependency change

```typescript
const [classrooms, setClassrooms] = useState<Classroom[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  if (user && profile?.role === "teacher") {
    fetchClassrooms();
  }
  // ...
}, [user, profile]);

const fetchClassrooms = async () => {
  const { data } = await supabase
    .from("classrooms")
    .select("*")
    .eq("teacher_id", user?.id)
    .order("created_at", { ascending: false });

  if (data) {
    setClassrooms(data as Classroom[]);
  }
  setLoading(false);
};
```

**Key aspects**:

- Fetches inside `useEffect`
- Local state for data and loading
- Direct Supabase query construction
- Explicit type casting of results

### Pattern 2: Request Queueing and Caching

**Found in**: `src/hooks/useTTS.ts:27-64`
**Used for**: Managing expensive API calls (Text-to-Speech)

```typescript
const cacheRef = useRef<TTSCache>({});
const requestQueueRef = useRef<Array<() => Promise<void>>>([]);

// Process queued requests with throttling
const processQueue = useCallback(async () => {
  if (isProcessingQueueRef.current) return;
  isProcessingQueueRef.current = true;

  while (requestQueueRef.current.length > 0) {
    // Wait if we have too many active requests
    while (activeRequestsRef.current >= MAX_CONCURRENT_REQUESTS) {
      await new Promise((r) => setTimeout(r, 100));
    }
    // ... execute request ...
  }
  isProcessingQueueRef.current = false;
}, []);
```

**Key aspects**:

- `useRef` for persistent cache (doesn't trigger re-renders)
- Manual queue management for concurrency control
- Throttling logic

## Pattern Examples: Component Patterns

### Pattern 1: UI Component (shadcn/ui style)

**Found in**: `src/components/ui/button.tsx:39-44`
**Used for**: Reusable accessible UI elements

```typescript
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
```

**Key aspects**:

- Uses `forwardRef` for ref forwarding
- Uses `class-variance-authority` (cva) for styling variants
- Uses `cn` utility for class merging
- Supports `asChild` for polymorphism (Radix UI Slot pattern)

### Pattern 2: Feature Component

**Found in**: `src/components/PodcastPromptCard.tsx:29-165`
**Used for**: Complex domain-specific UI with internal logic

```typescript
interface PodcastPromptCardProps {
  prompt: string;
  generationStep: GenerationStep;
  onPromptChange: (prompt: string) => void;
  // ...
}

export function PodcastPromptCard({
  prompt,
  generationStep,
}: // ...
PodcastPromptCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isGenerating =
    generationStep !== "idle" && generationStep !== "complete";

  // ... event handlers ...

  return (
    <div className="space-y-4">
      <Textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        // ...
      />
      {/* ... */}
    </div>
  );
}
```

**Key aspects**:

- Functional component with typed interface props
- Controlled inputs (passed from parent)
- Internal UI logic (refs, formatting) independent of parent
- Conditional rendering based on props

### Pattern 3: Utility Function

**Found in**: `src/lib/utils.ts:4-6`
**Used for**: CSS class merging

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Key aspects**:

- Combines `clsx` and `tailwind-merge`
- Standard pattern in this codebase for class manipulation

## Testing Patterns

### No Testing Patterns Found

**Search Scope**:

- Searched for `*.test.*` and `*.spec.*` files
- Checked `package.json` for testing scripts and dependencies

**Findings**:

- No test files exist in the codebase.
- No testing libraries (Jest, Vitest, React Testing Library) are listed in `package.json`.
- Project appears to rely on manual verification or browser-based testing currently.
