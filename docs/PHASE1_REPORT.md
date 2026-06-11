# Phase 1 Report: Project Scaffold — Complete

> **Date**: 2026-06-10
> **Last Updated**: 2026-06-10 11:56 IST
> **Status**: ✅ Complete
> **TypeScript**: 0 errors across all 3 packages
> **Servers**: Backend (port 3001) ✅ | Frontend (port 5173) ✅
> **Career Sites**: 90 Indian companies loaded from Referral Community spreadsheet 🆕

---

## 1. Executive Summary

Phase 1 established the full project foundation for the **Agentic Space** job-hunting agent. The monorepo contains three packages — `shared` (types/constants), `backend` (Express API + services/agents), and `frontend` (React PWA) — all passing TypeScript type-checking and running as live servers. An additional data source of **90 curated Indian company career sites** was ingested from the Referral Community spreadsheet.

| Package                   |         Source Files          | TypeScript Errors | Status |
| ------------------------- | :---------------------------: | :---------------: | :----: |
| `@agentic-space/shared`   | 9 source files (+1 generated) |         0         |   ✅   |
| `@agentic-space/backend`  |        19 source files        |         0         |   ✅   |
| `@agentic-space/frontend` |   16 source files + configs   |         0         |   ✅   |

---

## 2. Deliverables

### 2.1 Monorepo Configuration

| Artifact              | Description                                              |
| --------------------- | -------------------------------------------------------- |
| `package.json`        | Root workspace config with npm workspaces                |
| `.gitignore`          | Node_modules, dist, env, logs, uploads                   |
| `.env.example`        | Environment variable template (Ollama, ChromaDB, Notion) |
| `.npmrc`              | npm configuration                                        |
| `pnpm-workspace.yaml` | Legacy pnpm config (retained for reference)              |

### 2.2 Shared Types Package (`packages/shared`)

**4 type modules, 3 constant modules** defining the entire data contract:

| File                            | Exports                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `types/resume.ts`               | `Skill`, `WorkExperience`, `Education`, `ParsedResume`, `ResumeUploadResponse`                                                        |
| `types/job.ts`                  | `JobListing`, `BatchAction`, `BatchActionResponse`                                                                                    |
| `types/search.ts`               | `SearchFilters`, `SearchRequest`, `SearchResponse`, `LinkedInFilters`                                                                 |
| `types/logs.ts`                 | `LogAction`, `LogEntry`, `DailyLog`                                                                                                   |
| `constants/filters.ts`          | `DEFAULT_LOCATIONS`, `DEFAULT_SEARCH_FILTERS`, `DEFAULT_LINKEDIN_FILTERS`, `LINKEDIN_TPR_MAP`                                         |
| `constants/roles.ts`            | `ROLE_TAXONOMY` (10 roles), `getRolesBySkill()`, `getRoleByTitle()`                                                                   |
| `constants/company-sites.ts` 🆕 | `CompanyCareerSite`, `COMPANY_CAREER_SITES` (90 entries), `findCompanyCareerSite()`, `getAllCareerSiteUrls()`, `getSitesByCategory()` |

### 2.3 Backend Package (`apps/backend`)

**5 route modules:**

| Route               | Endpoints                                                            | Purpose                                               |
| ------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
| `routes/resume.ts`  | `POST /upload`, `GET /:id`, `DELETE /:id`                            | Upload + parse PDF/DOCX                               |
| `routes/jobs.ts`    | `POST /search`, `GET /:id`, `GET /:id/redirect`, `POST /batch`       | Multi-portal job search (now includes company_portal) |
| `routes/tailor.ts`  | `POST /`, `GET /:id/download`                                        | Resume vs JD tailoring                                |
| `routes/network.ts` | `POST /linkedin-message`, `POST /referral-request`, `POST /email-hr` | LinkedIn + email networking                           |
| `routes/logs.ts`    | `GET /`, `GET /:date`                                                | Activity log retrieval                                |

**8 service modules:**

| Service                  | Status         | Purpose                                                       |
| ------------------------ | -------------- | ------------------------------------------------------------- |
| `parser.ts`              | ✅ Implemented | PDF (pdf-parse) + DOCX (mammoth) text extraction              |
| `analyzer.ts`            | 🟡 Stub        | Resume skill/experience extraction via Ollama                 |
| `ollama.ts`              | ✅ Implemented | `generate()` and `embed()` functions for local LLM            |
| `chroma.ts`              | ✅ Implemented | Vector DB storage for resume embeddings                       |
| `search-orchestrator.ts` | 🟡 Partial     | Dispatches to company portal agent; LinkedIn/Naukri/Web stubs |
| `tailor.ts`              | 🟡 Stub        | Resume rewriting against JD                                   |
| `logger.ts`              | ✅ Implemented | Markdown-file activity logging                                |
| `notion.ts`              | 🟡 Stub        | Optional Notion sync                                          |

**4 agent modules:**

| Agent             | Status            | Purpose                                                            |
| ----------------- | ----------------- | ------------------------------------------------------------------ |
| `linkedin.ts`     | 🟡 Stub           | LinkedIn search with TPR/filters, Easy Apply detection             |
| `naukri.ts`       | 🟡 Stub           | Naukri search sorted by freshness                                  |
| `web-search.ts`   | 🟡 Stub           | Generic web job search (Google Jobs, Indeed)                       |
| `company-site.ts` | ✅ **Updated** 🆕 | Curated 90-company DB lookup + ATS detection + direct URL building |

**2 browser utilities:**

| Module          | Status         | Purpose                                                |
| --------------- | -------------- | ------------------------------------------------------ |
| `playwright.ts` | ✅ Implemented | Browser pool manager (context, page creation, cleanup) |
| `stealth.ts`    | ✅ Implemented | Anti-detection scripts for bot evasion                 |

**Configuration:**
| File | Purpose |
|------|---------|
| `index.ts` | Express app entry point with CORS, routes, health check |
| `config.ts` | Environment-var-based configuration |
| `types/pdf-parse.d.ts` | Type declarations for pdf-parse module |

### 2.4 Frontend Package (`apps/frontend`)

**5 pages:**

| Page            | Route       | Purpose                                                                                             |
| --------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| `Dashboard.tsx` | `/`         | Resume upload via drag-and-drop, resume management                                                  |
| `JobBoard.tsx`  | `/jobs`     | Job listing with filters, batch selection (includes company_portal source)                          |
| `JobDetail.tsx` | `/jobs/:id` | Full JD view, tailoring, networking actions, company career site redirect                           |
| `LogViewer.tsx` | `/logs`     | Agent activity history                                                                              |
| `Settings.tsx`  | `/settings` | Ollama config, **career sites database (90 companies)**, .xlsx/.csv upload, job preferences, Notion |

**6 components:**

| Component          | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `Layout.tsx`       | Header + bottom navigation + outlet                  |
| `ResumeUpload.tsx` | Drag-and-drop file upload (react-dropzone)           |
| `JobCard.tsx`      | Job listing card with checkbox, match badge, actions |
| `MatchBadge.tsx`   | Color-coded match percentage badge                   |
| `BatchActions.tsx` | Select All / Clear / Apply / Tailor / Save toolbar   |
| `FilterBar.tsx`    | Keyword search + advanced filter panel               |

**3 hooks:**

| Hook                | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `useJobs.ts`        | Job search, loading, error state management |
| `useResume.ts`      | Resume upload, list, delete management      |
| `useBatchSelect.ts` | Toggle, Select All, Clear selection state   |

**Styling & PWA:**

| File                      | Purpose                                        |
| ------------------------- | ---------------------------------------------- |
| `styles/globals.css`      | Tailwind + cartoon-brutalist component classes |
| `tailwind.config.js`      | Custom colors, fonts, shadows                  |
| `vite.config.ts`          | Vite + React + PWA plugin + API proxy          |
| `index.html`              | PWA meta tags, apple-touch-icon                |
| `public/favicon.svg`      | Robot favicon (cartoon-brutalist)              |
| `public/icons/icon-*.svg` | PWA app icons (192x192, 512x512)               |

---

## 3. Architecture Verification

### 3.1 TypeScript Compilation

```
@agentic-space/shared   → tsc --noEmit   → 0 errors ✅  (includes new company-sites.ts)
@agentic-space/backend  → tsc --noEmit   → 0 errors ✅  (includes updated company-site.ts + orchestrator)
@agentic-space/frontend → tsc --noEmit   → 0 errors ✅  (includes updated Settings.tsx)
```

### 3.2 Server Health

```bash
# Backend (port 3001)
GET /api/health → 200 OK
# Response: { "status": "ok", "timestamp": "2026-06-10T06:30:00.000Z", "version": "1.0.0" }

# Frontend (port 5173)
Vite dev server ready in 570ms
React renders: Header ("AGENTIC SPACE") + Navigation + Upload dropzone
```

### 3.3 Dependency Audit

| Runtime Deps (backend) | Version | Purpose              |
| ---------------------- | ------- | -------------------- |
| express                | ^4.21.0 | HTTP server          |
| cors                   | ^2.8.5  | Cross-origin support |
| multer                 | ^1.4.5  | File upload handling |
| pdf-parse              | ^1.1.1  | PDF text extraction  |
| mammoth                | ^1.8.0  | DOCX text extraction |
| playwright             | ^1.48.0 | Browser automation   |
| cheerio                | ^1.0.0  | HTML parsing         |
| chromadb               | ^1.9.0  | Vector database      |
| uuid                   | ^10.0.0 | ID generation        |

| Runtime Deps (frontend) | Version | Purpose              |
| ----------------------- | ------- | -------------------- |
| react                   | ^18.3.0 | UI framework         |
| react-dom               | ^18.3.0 | DOM rendering        |
| react-router-dom        | ^6.26.0 | Client-side routing  |
| react-dropzone          | ^14.2.3 | Drag-and-drop upload |

---

## 4. Project Structure (Complete File Tree)

```
agentic-space/
├── .env.example              # Environment template
├── .gitignore                # Ignore rules
├── .npmrc                    # npm config
├── package.json              # Root workspace config
├── pnpm-workspace.yaml       # Legacy pnpm config
│
├── docs/
│   ├── ARCHITECTURE_PLAN.md  # Full architecture doc (17 sections)
│   └── PHASE1_REPORT.md      # This document
│
├── packages/
│   └── shared/               # @agentic-space/shared
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                      # Barrel exports
│           ├── types/
│           │   ├── resume.ts                 # 6 interfaces
│           │   ├── job.ts                    # 4 interfaces/type aliases
│           │   ├── search.ts                 # 5 interfaces/type aliases
│           │   └── logs.ts                   # 3 interfaces/type aliases
│           └── constants/
│               ├── filters.ts                # Default filters + TPR map
│               ├── roles.ts                  # 10 role definitions + helpers
│               └── company-sites.ts 🆕       # 90 company career sites + lookup
│
├── apps/
│   ├── backend/              # @agentic-space/backend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                      # Express entry + routes
│   │       ├── config.ts                     # Env config loader
│   │       ├── types/
│   │       │   └── pdf-parse.d.ts            # Module type decl
│   │       ├── routes/
│   │       │   ├── resume.ts                 # 3 endpoints
│   │       │   ├── jobs.ts                   # 4 endpoints
│   │       │   ├── tailor.ts                 # 2 endpoints
│   │       │   ├── network.ts                # 3 endpoints
│   │       │   └── logs.ts                   # 2 endpoints
│   │       ├── services/
│   │       │   ├── parser.ts                 # PDF/DOCX parser
│   │       │   ├── analyzer.ts               # Skill extractor (stub)
│   │       │   ├── ollama.ts                 # LLM client
│   │       │   ├── chroma.ts                 # Vector DB client
│   │       │   ├── search-orchestrator.ts    # Portal coordinator + company portal dispatch
│   │       │   ├── tailor.ts                 # Resume rewriter (stub)
│   │       │   ├── logger.ts                 # Markdown logger
│   │       │   └── notion.ts                 # Notion sync (stub)
│   │       ├── agents/
│   │       │   ├── linkedin.ts               # LinkedIn search (stub)
│   │       │   ├── naukri.ts                 # Naukri search (stub)
│   │       │   ├── web-search.ts             # Web search (stub)
│   │       │   └── company-site.ts ✅ 🆕    # 90-company DB lookup + ATS detection
│   │       └── browser/
│   │           ├── playwright.ts              # Browser pool
│   │           └── stealth.ts                 # Anti-detection
│   │
│   └── frontend/             # @agentic-space/frontend
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       ├── postcss.config.js
│       ├── index.html
│       ├── public/
│       │   ├── favicon.svg
│       │   └── icons/
│       │       ├── icon-192x192.svg
│       │       └── icon-512x512.svg
│       └── src/
│           ├── main.tsx
│           ├── App.tsx                       # Routes
│           ├── pages/
│           │   ├── Dashboard.tsx             # Resume upload
│           │   ├── JobBoard.tsx              # Job listing
│           │   ├── JobDetail.tsx             # Job actions
│           │   ├── LogViewer.tsx             # Activity log
│           │   └── Settings.tsx    🆕       # Career DB + upload
│           ├── components/
│           │   ├── Layout.tsx                # Shell layout
│           │   ├── ResumeUpload.tsx          # Drag-drop upload
│           │   ├── JobCard.tsx               # Job listing card
│           │   ├── MatchBadge.tsx            # Score badge
│           │   ├── BatchActions.tsx          # Batch toolbar
│           │   └── FilterBar.tsx             # Search filters
│           ├── hooks/
│           │   ├── useJobs.ts
│           │   ├── useResume.ts
│           │   └── useBatchSelect.ts
│           ├── services/
│           │   └── api.ts                   # Full API client
│           └── styles/
│               └── globals.css              # Tailwind + brutalist
│
└── logs/                     # Auto-generated activity logs
```

---

## 5. Career Sites Database (New Section)

### 5.1 Overview

The Referral Community spreadsheet (provided by the user on 2026-06-10) was parsed and integrated as a first-class data source. It contains **90 Indian companies** organized into three categories:

| Category                   | Count | Examples                                                               |
| -------------------------- | :---: | ---------------------------------------------------------------------- |
| Top Companies              |  ~25  | Accenture, TCS, Microsoft, Amazon, Deloitte, Wipro, Infosys            |
| Mid-Size + Product         |  ~30  | Birlasoft, Blackbaud, Broadridge, Cisco, Coforge, Dell, EY, Salesforce |
| Small Companies / Startups |  ~35  | Accolite, Alacriti, Evoke, Invenio, MiQ, Searce, Tudip                 |

### 5.2 How It Works

- **Lookup**: `findCompanyCareerSite(companyName)` does case-insensitive fuzzy matching against the 90 company names
- **ATS Detection**: The `company-site.ts` agent detects known ATS platforms (Workday, Greenhouse, Lever, Ashby, BambooHR, SuccessFactors, Taleo, iCIMS) from the career URL
- **Direct URL Building**: When the ATS is known, the agent constructs a direct job-application URL from the job ID
- **LinkedIn Fallback**: Some small startups without their own career portals have LinkedIn job search URLs as fallback

### 5.3 Data Flow

```
Job Search Request
  ├── LinkedIn     (Phase 3 — Playwright)
  ├── Naukri       (Phase 3 — Playwright)
  ├── Indeed/Web   (Phase 3 — Cheerio)
  └── Company Portals ✅ (NOW LIVE)
       └── [company name] → lookup in 90-entry curated DB
       ├── Found with career URL → return career page + ATS type
       ├── Found with LinkedIn URL → return LinkedIn redirect
       └── Not found → Playwright fallback search (Phase 3)
```

### 5.4 UI

The Settings page now includes a **"Career Sites Database"** section showing:

- Total company count (90) with category badges
- File upload for .xlsx/.csv updates (for adding more companies)
- Expandable company list (Phase 2 — fetches from backend API)

---

## 6. Key Design Decisions

### 6.1 Monorepo Workspaces (npm, not pnpm)

The project started with pnpm but was migrated to npm workspaces due to pnpm 11's strict build-approval system blocking esbuild. npm workspaces provide equivalent functionality without the policy overhead.

### 6.2 TypeScript Strict Mode

All three packages use `strict: true` in tsconfig.json, ensuring:

- No implicit `any` types
- Strict null checks
- Strict function types
- No unused locals/parameters (relaxed for stubs)

### 6.3 Cartoon Brutalist Design

The frontend uses a deliberate cartoon-brutalist aesthetic:

- Bold black outlines (`border-2 border-black`)
- Flat, saturated colors (Yale/Kodak yellow palette)
- Chunky drop shadows (`shadow-[4px_4px_0px_#000]`)
- Expressive monospace display font
- No gradients, no glassmorphism, no SaaS-generic styling

### 6.4 RAG-First Architecture

The backend is designed around local LLM inference (Ollama) with vector search (ChromaDB):

- No paid API keys required for core functionality
- Resume embeddings stored in ChromaDB
- Job JD embeddings matched via cosine similarity
- Fallback to HuggingFace Inference API on Render's free tier (if needed)

### 6.5 Human-In-The-Loop (HITL)

The agent is designed to **surface, filter, and redirect** — not to auto-apply:

- LinkedIn jobs: redirect user to exact job URL
- Naukri jobs: redirect to application page
- Company career pages: navigate to ATS platform
- User always clicks the final "Apply" / "Send" button

### 6.6 Career Sites as First-Class Source 🆕

Company career pages from the Referral Community database are now a **primary job source**, searched in parallel with LinkedIn and Naukri. This means jobs that never appear on LinkedIn or Naukri (posted only on the company's own careers page) will be found.

---

## 7. Stubs Ready for Phase 2+

| File                              | Phase | What to implement                                      |
| --------------------------------- | ----- | ------------------------------------------------------ |
| `services/analyzer.ts`            | P2    | Ollama prompt for skill/experience extraction          |
| `services/search-orchestrator.ts` | P2    | Full parallel portal search (LinkedIn, Naukri, Indeed) |
| `services/tailor.ts`              | P2    | Llama prompt for resume rewriting                      |
| `services/notion.ts`              | P4    | Notion API sync                                        |
| `agents/linkedin.ts`              | P3    | Playwright-based LinkedIn search with filters          |
| `agents/naukri.ts`                | P3    | Playwright-based Naukri search with freshness sort     |
| `agents/web-search.ts`            | P3    | Google Jobs + Indeed search                            |
| `agents/company-site.ts`          | P3    | Playwright-based fallback for unknown companies        |

---

## 8. How to Run

```bash
# Prerequisites
# - Node.js 20+
# - Ollama (optional, for LLM features): ollama serve

# Install dependencies
npm install

# Terminal 1: Backend (port 3001)
npm run dev -w apps/backend

# Terminal 2: Frontend (port 5173)
npm run dev -w apps/frontend

# Type-check all packages
npm run typecheck -w packages/shared
npm run typecheck -w apps/backend
npm run typecheck -w apps/frontend
```

---

## 9. Next Phase Roadmap

| Phase       | Focus             | Key Deliverables                                                                      |
| ----------- | ----------------- | ------------------------------------------------------------------------------------- |
| **Phase 2** | Resume Analyzer   | Ollama skill extraction, PDF/DOCX pipeline, ChromaDB storage, role suggestion API     |
| **Phase 3** | Job Search Engine | Playwright-based LinkedIn/Naukri/Web search, career site crawling, filter application |
| **Phase 4** | RAG Job Matching  | JD embedding, similarity scoring, match percentage algorithm                          |
| **Phase 5** | Dashboard UI      | API integration, batch select logic, resume download, job redirect URLs               |
| **Phase 6** | Networking        | LinkedIn message/connection templates, email drafts, referral requests                |
| **Phase 7** | Logging + Deploy  | Notion sync, Vercel frontend deployment, Render backend deployment                    |

---

_Report generated from verified project state — servers running, TypeScript clean, structure documented._
_Last updated: 2026-06-10 11:56 IST — added career sites database section, updated file tree, stub status, and architecture details._
