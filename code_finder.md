# Omnicast Codebase - File Locations

## Project Overview

This is a **React + TypeScript** web application using **Vite** as the build tool, **Supabase** for backend services, and **Tailwind CSS** for styling.

---

## Root Configuration Files

| File                 | Purpose                           |
| -------------------- | --------------------------------- |
| `package.json`       | Project dependencies and scripts  |
| `vite.config.ts`     | Vite bundler configuration        |
| `tsconfig.json`      | Root TypeScript configuration     |
| `tsconfig.app.json`  | App-specific TypeScript settings  |
| `tsconfig.node.json` | Node-specific TypeScript settings |
| `tailwind.config.ts` | Tailwind CSS configuration        |
| `postcss.config.js`  | PostCSS configuration             |
| `eslint.config.js`   | ESLint rules                      |
| `components.json`    | UI component configuration        |
| `index.html`         | HTML entry point                  |
| `.env`               | Environment variables             |
| `.gitignore`         | Git ignore patterns               |

---

## Source Code (`src/`)

### Entry Points

| File                | Purpose                    |
| ------------------- | -------------------------- |
| `src/main.tsx`      | Application bootstrap      |
| `src/App.tsx`       | Root application component |
| `src/App.css`       | Root component styles      |
| `src/index.css`     | Global styles              |
| `src/vite-env.d.ts` | Vite type declarations     |

---

### Pages (`src/pages/`) - Contains 10 files

| File                      | Purpose                    |
| ------------------------- | -------------------------- |
| `Index.tsx`               | Landing/home page          |
| `AuthPage.tsx`            | Authentication page        |
| `DashboardPage.tsx`       | User dashboard             |
| `StudioPage.tsx`          | Main studio interface      |
| `DemoStudioPage.tsx`      | Demo studio variant        |
| `ClassroomPage.tsx`       | Classroom view             |
| `ClassroomStudioPage.tsx` | Classroom studio interface |
| `NewClassroomPage.tsx`    | Create new classroom       |
| `JoinPage.tsx`            | Join classroom/session     |
| `NotFound.tsx`            | 404 page                   |

---

### Feature Components (`src/components/`) - Contains 15 files + 2 subdirectories

| File                           | Purpose                         |
| ------------------------------ | ------------------------------- |
| `AIThinkingOverlay.tsx`        | AI processing overlay UI        |
| `BuildingOutlineCard.tsx`      | Building outline card component |
| `DocumentIngestionPreview.tsx` | Document ingestion preview      |
| `DocumentSidebar.tsx`          | Document sidebar navigation     |
| `Header.tsx`                   | Application header              |
| `HeroSection.tsx`              | Hero section for landing page   |
| `HostCustomizer.tsx`           | Host customization interface    |
| `NavLink.tsx`                  | Navigation link component       |
| `OutputCard.tsx`               | Output display card             |
| `PlaybackView.tsx`             | Media playback interface        |
| `PodcastPromptCard.tsx`        | Podcast prompt card             |
| `ProducerControlPanel.tsx`     | Producer controls interface     |
| `StudentClassroomView.tsx`     | Student view for classroom      |
| `ViralClipsView.tsx`           | Viral clips display             |
| `Waveform.tsx`                 | Audio waveform visualization    |

---

### Studio Components (`src/components/studio/`) - Contains 5 files

| File                       | Purpose                    |
| -------------------------- | -------------------------- |
| `StudioDocumentUpload.tsx` | Document upload for studio |
| `StudioGenerateButton.tsx` | Generate button component  |
| `StudioHostCard.tsx`       | Host card in studio        |
| `StudioHostPanel.tsx`      | Host panel controls        |
| `StudioTopicInput.tsx`     | Topic input field          |

---

### UI Component Library (`src/components/ui/`) - Contains 49 files

Reusable UI primitives (likely shadcn/ui):

`accordion.tsx`, `alert-dialog.tsx`, `alert.tsx`, `aspect-ratio.tsx`, `avatar.tsx`, `badge.tsx`, `breadcrumb.tsx`, `button.tsx`, `calendar.tsx`, `card.tsx`, `carousel.tsx`, `chart.tsx`, `checkbox.tsx`, `collapsible.tsx`, `command.tsx`, `context-menu.tsx`, `dialog.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `form.tsx`, `hover-card.tsx`, `input-otp.tsx`, `input.tsx`, `label.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `pagination.tsx`, `popover.tsx`, `progress.tsx`, `radio-group.tsx`, `resizable.tsx`, `scroll-area.tsx`, `select.tsx`, `separator.tsx`, `sheet.tsx`, `sidebar.tsx`, `skeleton.tsx`, `slider.tsx`, `sonner.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`, `toast.tsx`, `toaster.tsx`, `toggle-group.tsx`, `toggle.tsx`, `tooltip.tsx`, `use-toast.ts`

---

### Custom Hooks (`src/hooks/`) - Contains 5 files

| File                 | Purpose                  |
| -------------------- | ------------------------ |
| `use-mobile.tsx`     | Mobile device detection  |
| `use-toast.ts`       | Toast notification hook  |
| `useAuth.ts`         | Authentication hook      |
| `usePodcastStore.ts` | Podcast state management |
| `useTTS.ts`          | Text-to-speech hook      |

---

### Library/Utilities (`src/lib/`) - Contains 4 files

| File                  | Purpose                              |
| --------------------- | ------------------------------------ |
| `utils.ts`            | General utility functions            |
| `elevenlabs.ts`       | ElevenLabs API integration           |
| `podcastGenerator.ts` | Podcast generation logic             |
| `rag.ts`              | RAG (Retrieval Augmented Generation) |

---

### Type Definitions (`src/types/`) - Contains 2 files

| File         | Purpose               |
| ------------ | --------------------- |
| `mentis.ts`  | Mentis-related types  |
| `podcast.ts` | Podcast-related types |

---

### Contexts (`src/contexts/`) - Contains 1 file

| File              | Purpose                         |
| ----------------- | ------------------------------- |
| `AuthContext.tsx` | Authentication context provider |

---

### Integrations (`src/integrations/`)

#### Supabase Client (`src/integrations/supabase/`) - Contains 2 files

| File        | Purpose                  |
| ----------- | ------------------------ |
| `client.ts` | Supabase client setup    |
| `types.ts`  | Supabase generated types |

---

### Assets (`src/assets/`)

| File                | Purpose          |
| ------------------- | ---------------- |
| `omnicast-logo.png` | Application logo |

---

## Backend - Supabase (`supabase/`)

### Configuration

| File                   | Purpose                        |
| ---------------------- | ------------------------------ |
| `supabase/config.toml` | Supabase project configuration |

---

### Edge Functions (`supabase/functions/`) - Contains 3 functions

| Directory               | Entry File | Purpose                     |
| ----------------------- | ---------- | --------------------------- |
| `elevenlabs-tts/`       | `index.ts` | ElevenLabs text-to-speech   |
| `generate-podcast/`     | `index.ts` | Podcast generation endpoint |
| `generate-scene-image/` | `index.ts` | Scene image generation      |

---

### Database Migrations (`supabase/migrations/`) - Contains 9 SQL files

Migration files (chronological order):

- `20260113033022_38a66d76-afb1-491e-8fa6-e685726335c7.sql`
- `20260113033038_d314aedc-6b00-40f4-88e5-10373852c627.sql`
- `20260113040912_4c0d95ff-ed5f-4f34-b976-2bb8deacac62.sql`
- `20260113041122_e1bbd50e-6a5d-4fc5-9f15-982d7b39d9b4.sql`
- `20260113041741_36163b57-6f5a-494a-95a6-2fed8352389f.sql`
- `20260113042157_12f52d1e-708a-4ef7-96d4-37ae423767f3.sql`
- `20260113042606_1413d65e-4b56-40b8-b87c-39a59abbcedc.sql`
- `20260113042653_b279ff3b-5030-4366-959b-41656cc8dc48.sql`
- `20260113043757_c249c618-2cda-4c4e-9bd2-98f2dc9db5b0.sql`

---

## Public Assets (`public/`) - Contains 4 files

| File              | Purpose             |
| ----------------- | ------------------- |
| `favicon.ico`     | Browser tab icon    |
| `favicon.png`     | PNG favicon variant |
| `placeholder.svg` | Placeholder image   |
| `robots.txt`      | SEO crawling rules  |

---

## Documentation

| File        | Purpose               |
| ----------- | --------------------- |
| `README.md` | Project documentation |

---

## Directory Summary

| Directory                    | File Count  | Description                |
| ---------------------------- | ----------- | -------------------------- |
| `src/`                       | 99 files    | Main source code           |
| `src/components/`            | 69 files    | All React components       |
| `src/components/ui/`         | 49 files    | UI component library       |
| `src/components/studio/`     | 5 files     | Studio-specific components |
| `src/pages/`                 | 10 files    | Route pages                |
| `src/hooks/`                 | 5 files     | Custom React hooks         |
| `src/lib/`                   | 4 files     | Utilities and integrations |
| `src/types/`                 | 2 files     | TypeScript definitions     |
| `src/contexts/`              | 1 file      | React contexts             |
| `src/integrations/supabase/` | 2 files     | Supabase client            |
| `supabase/functions/`        | 3 functions | Edge functions             |
| `supabase/migrations/`       | 9 files     | Database migrations        |
| `public/`                    | 4 files     | Static assets              |

---

## Key Entry Points

- **Application Entry**: `src/main.tsx` → `src/App.tsx`
- **Routing**: Defined in `src/App.tsx`
- **Backend Entry**: `supabase/functions/*/index.ts`
- **Database Schema**: `supabase/migrations/*.sql`
- **Type Definitions**: `src/integrations/supabase/types.ts`
