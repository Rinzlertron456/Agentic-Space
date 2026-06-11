# Job Hunting Agent System — Architecture & Implementation Plan

> **Status**: Active | **Last Updated**: 2026-06-10 11:59 IST
> **Tech Stack**: TypeScript, Node.js, Express, React, Vite, Ollama, ChromaDB, Playwright, Vercel, Render
> **Package Manager**: npm workspaces (migrated from pnpm)
> **Career Sites**: 90 Indian companies curated from Referral Community spreadsheet 🆕

---

## 1. Overview

An autonomous job-hunting agent that ingests resumes, extracts skills/experience, searches multiple job portals (including a curated database of 90+ Indian company career sites), matches candidates to roles, and supports Human-In-The-Loop (HITL) application workflows. The system runs RAG-first using only local/open-source tools — **zero paid API keys required**.

### Core Principles

- **RAG-First**: All LLM operations use Ollama (local) + ChromaDB (local vector store). No OpenAI/Claude API keys needed.
- **HITL (Human-In-The-Loop)**: The agent searches, filters, ranks, and redirects. The human always makes the final decision to apply.
- **Mobile-First**: React PWA, installable on phone home screens, deployed on Vercel.
- **No Auto-Apply**: Instead of unreliable bot-based form filling, the agent redirects users to exact job URLs with pre-filled context.
- **Curated Data Sources**: In addition to scraping job portals, the agent uses a hand-curated database of 90 Indian company career pages for direct job applications.

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                   React PWA (Mobile-First)                        │
│                   Deployed on Vercel                              │
│  Upload Resume │ Job Board │ HITL Actions │ Career Sites Config   │
└──────────────────────────┬───────────────────────────────────────┘
                           │ REST + WebSocket
┌──────────────────────────▼───────────────────────────────────────┐
│               Backend Agent (Node.js + Express)                   │
│               Deployed on Render                                  │
│                                                                    │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │ Resume Analyzer  │  │ Job Search       │  │ Application     │  │
│  │                  │  │ Orchestrator     │  │ Redirector      │  │
│  │ Ollama + ChromaDB│  │                  │  │                 │  │
│  │ (RAG)            │  │ Playwright      │  │ Direct URLs     │  │
│  │                  │  │ Cheerio         │  │ ATS pre-fill    │  │
│  │                  │  │ Career Sites DB │  │                 │  │
│  └─────────────────┘  └──────────────────┘  └─────────────────┘  │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │ LinkedIn         │  │ Naukri           │  │ Logging         │  │
│  │ Searcher         │  │ Searcher         │  │ (Markdown +     │  │
│  │ (search+filters) │  │ (search+      │  │  Notion API)    │  │
│  │                  │  │  freshness sort) │  │                 │  │
│  └─────────────────┘  └──────────────────┘  └─────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Company Career Sites Agent 🆕                                │ │
│  │  - 90-entry curated DB (Referral Community spreadsheet)       │ │
│  │  - ATS platform detection (Workday, Greenhouse, Lever, etc.)  │ │
│  │  - Direct job URL construction                                 │ │
│  │  - CSV/XLSX upload for adding more sites                      │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Choices & Rationale

| Technology | Purpose | Why |
|------------|---------|-----|
| **Ollama** | Local LLM for resume analysis, job matching, resume tailoring | Zero API keys, runs locally, supports RAG embeddings |
| **ChromaDB** | Vector database for resume & JD embeddings | Local, open-source, pairs with Ollama for RAG |
| **Playwright** | Browser automation for job portal scraping | Handles JS-rendered pages (LinkedIn, Naukri), stealth mode available |
| **Cheerio** | Lightweight HTML parsing for static job pages | Faster than Playwright for simple search result pages |
| **pdf-parse / mammoth** | Resume parsing (PDF/DOCX) | Extract text from uploaded resumes |
| **Express.js** | Backend API server | Mature, well-supported, deployable anywhere |
| **React + Vite** | Frontend PWA | Fast builds, PWA plugin, mobile-optimized |
| **Tailwind CSS** | Styling | Utility-first, responsive, cartoon-brutalist capable |
| **npm workspaces** | Monorepo management | Reliable on Windows, no build-policy issues |
| **Vercel** | Frontend deployment | Free tier, optimal React/static hosting |
| **Render** | Backend deployment | Free tier web services, supports Node.js |

---

## 4. LLM Strategy (RAG-First)

### Development Mode (Local)
- Ollama runs locally on developer machine
- Models: `llama3.2` (3B) for fast classification, `mistral` (7B) for resume rewriting
- ChromaDB runs locally via Docker or npx
- Embedding model: `nomic-embed-text` (Ollama)

### Production Mode (Render Free Tier)
- **Option A**: Lightweight Ollama on Render (may need 1GB+ RAM tier)
- **Option B**: HuggingFace Inference API free tier for embeddings + text generation (fallback)
- **Option C**: User runs Ollama locally, backend on Render connects to user's local Ollama via ngrok/tunnel

### RAG Pipeline
```
Resume Upload → Parse (PDF/DOCX) → Chunk → Embed (Ollama) → Store (ChromaDB)
                                                          ↓
Job JD → Embed (Ollama) → Query ChromaDB → Similarity Score → Ranked Matches
```

---

## 5. HITL Flow (Human-In-The-Loop)

```
┌─────────────────────────────────────────────────────────┐
│                    USER ACTIONS                          │
│                                                          │
│  1. Upload Resume(s)                                     │
│     │                                                    │
│     ▼                                                    │
│  2. Agent extracts skills, experience, preferences       │
│     │                                                    │
│     ▼                                                    │
│  3. Agent searches job portals + career sites with filters│
│     │                                                    │
│     ▼                                                    │
│  4. Dashboard displays ranked job cards                  │
│     │                                                    │
│     ▼                                                    │
│  5. User reviews jobs, selects (batch / select all)      │
│     │                                                    │
│     ├──► "Tailor Resume" → Downloads tailored .docx      │
│     │                                                    │
│     ├──► "Apply" → Redirects to exact job URL            │
│     │   ├── LinkedIn                                     │
│     │   ├── Naukri                                       │
│     │   └── Company Career Page 🆕                       │
│     │                                                    │
│     ├──► "Company Site" → Opens org career page          │
│     │                                                    │
│     ├──► "Draft Message" → Generates LinkedIn note       │
│     │                                                    │
│     └──► "Email HR" → Opens Gmail compose with draft     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Key HITL Principles
- Agent **never auto-submits** applications
- Agent **never sends** LinkedIn messages/connection requests autonomously
- Agent **prepares and redirects** — user always clicks the final "Apply" / "Send"
- Batch selection: user selects multiple jobs → agent queues tailoring/redirects

---

## 6. Job Portal Strategies

### 6.1 LinkedIn
- **Search**: Playwright with stealth plugin, use pre-configured filters:
  - Posted: past 24 hours (`TPR=r3600` in URL — note: URL initially shows `r86400`, replace with `r3600`)
  - Role type: Full-Time
  - Experience: Associate & Mid-Senior Level
  - Location: Hyderabad, Bengaluru, Pune
- **Avoid**: Easy Apply jobs (skip or flag)
- **Action**: For non-Easy-Apply jobs, redirect user to exact job URL
- **Networking**: Draft connection request messages to hiring team, draft referral requests for connections at target companies

### 6.2 Naukri
- **Search**: Playwright-based, search by role keywords extracted from resume
- **Sort**: By freshness (newest first)
- **Filter**: Latest roles only
- **Questions**: If Naukri asks screening questions, agent attempts to answer based on resume
- **Fallback**: If Job ID present, search company portal for same role

### 6.3 Company Career Pages 🆕
- **Primary Source**: Curated database of **90 Indian company career sites** from the Referral Community spreadsheet
- **Lookup**: Case-insensitive fuzzy matching via `findCompanyCareerSite(companyName)`
- **ATS Detection**: Auto-detects Workday, Greenhouse, Lever, Ashby, BambooHR, SuccessFactors, Taleo, iCIMS
- **Direct URL Building**: Constructs job-application URLs when ATS pattern is known
- **LinkedIn Fallback**: Small startups without career portals get LinkedIn job-search redirects
- **Extensibility**: Users can upload new .xlsx/.csv files via the Settings page to add more companies

### 6.4 General Web Search
- Search across: Indeed India, Glassdoor, Google Jobs, company career pages
- Filter: India only, matches user preferences

---

## 7. Resume Tailoring Engine

```
Original Resume + Job Description
              │
              ▼
       Ollama (mistral 7B)
       Prompt: "Rewrite resume bullets to match JD keywords.
                Keep truthful. Do not fabricate experience.
                Output: tailored resume in markdown."
              │
              ▼
       Convert markdown → DOCX (using docx library)
              │
              ▼
       Download button in dashboard
```

- Tailoring is **always user-initiated** (click "Tailor for this job")
- Original resume is never overwritten
- Tailored version stored temporarily, downloadable as PDF/DOCX

---

## 8. Logging & Notes System

### Primary: Local Markdown Logs
- All agent actions logged to `/logs/` directory
- Structured format: `YYYY-MM-DD.md` with timestamps per entry
- Includes: job searches, matches found, applications clicked, messages drafted

### Optional: Notion Sync
- If user provides Notion integration token
- Sync logs to a Notion database
- Fields: Date, Action, Job Title, Company, URL, Status

### Not Supported
- Google Keep (no public API available)

---

## 9. Frontend UI Design

### Design System: Cartoon Brutalist
- Bold black outlines (`border-2 border-black`)
- Flat solid colors (yellow, cyan, coral, white)
- Chunky drop shadows (`shadow-[4px_4px_0px_#000]`)
- Expressive typography (system fonts, bold weights)
- No gradients, no glassmorphism, no SaaS-generic

### Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Dashboard` | Upload resume, view stats, start search |
| `/jobs` | `JobBoard` | Job cards with match scores, batch actions |
| `/jobs/:id` | `JobDetail` | Full JD, action buttons, company site redirect |
| `/logs` | `LogViewer` | Activity log, filterable |
| `/settings` | `Settings` | Ollama config, **career sites DB (90 companies)**, .xlsx/.csv upload, Notion |

### Mobile-First Features
- PWA manifest for installability
- Service worker for offline caching
- Touch-friendly tap targets (≥44×44px)
- Bottom navigation bar
- Pull-to-refresh on job board

---

## 10. Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     INTERNET                             │
│                                                          │
│  ┌──────────────────┐       ┌──────────────────────────┐│
│  │ Vercel (Free)    │       │ Render (Free/Starter)     ││
│  │                  │       │                           ││
│  │ React PWA        │◄─────►│ Express API              ││
│  │ - Static build   │ HTTPS │ - /api/resume            ││
│  │ - CDN cached     │       │ - /api/jobs              ││
│  │ - Custom domain  │       │ - /api/search            ││
│  │   (optional)     │       │ - /api/tailor            ││
│  │                  │       │ - /api/career-sites      ││
│  └──────────────────┘       │                           ││
│                              │ Playwright (headless)    ││
│                              │ ChromaDB (embedded)      ││
│                              │ Ollama client            ││
│                              │ Career Sites DB 🆕       ││
│                              └──────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Ollama Deployment Strategy
For Render (limited RAM on free tier), we implement a **dual-mode** approach:

1. **Local Mode** (development): Backend connects to `localhost:11434` (Ollama default)
2. **Remote Mode** (production): Backend connects to Ollama instance specified by `OLLAMA_HOST` env var
   - User can run Ollama locally and expose via ngrok
   - Or deploy Ollama on a separate Render instance with more RAM

### Environment Variables
```
# .env (backend)
PORT=3001
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=mistral
CHROMA_URL=http://localhost:8000
NOTION_TOKEN=           # optional
NOTION_DATABASE_ID=     # optional
FRONTEND_URL=http://localhost:5173

# .env (frontend)
VITE_API_URL=http://localhost:3001/api
```

---

## 11. Project Structure

```
agentic-space/
├── .env.example              # Environment template
├── .gitignore                # Ignore rules
├── .npmrc                    # npm config
├── package.json              # Root workspace config
├── pnpm-workspace.yaml       # Legacy pnpm config
│
├── docs/
│   ├── ARCHITECTURE_PLAN.md  # This document
│   └── PHASE1_REPORT.md      # Phase 1 completion report
│
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                    # Barrel exports
│           ├── types/
│           │   ├── resume.ts               # Skill, ParsedResume, etc.
│           │   ├── job.ts                  # JobListing, BatchAction
│           │   ├── search.ts               # SearchFilters, LinkedInFilters
│           │   └── logs.ts                 # LogEntry, LogAction
│           └── constants/
│               ├── filters.ts              # Default filters, TPR map
│               ├── roles.ts                # 10 role definitions
│               └── company-sites.ts   🆕   # 90 companies + lookup
│
├── apps/
│   ├── backend/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                   # Express entry + routes
│   │       ├── config.ts                  # Env config loader
│   │       ├── types/
│   │       │   └── pdf-parse.d.ts
│   │       ├── routes/
│   │       │   ├── resume.ts              # Upload, parse, CRUD
│   │       │   ├── jobs.ts                # Search, redirect, batch
│   │       │   ├── tailor.ts              # Tailor + download
│   │       │   ├── network.ts             # LinkedIn msg, referral, email
│   │       │   └── logs.ts                # Log retrieval
│   │       ├── services/
│   │       │   ├── parser.ts              # PDF/DOCX text extraction
│   │       │   ├── analyzer.ts            # Skill extraction (stub)
│   │       │   ├── ollama.ts              # LLM generate + embed
│   │       │   ├── chroma.ts              # Vector DB client
│   │       │   ├── search-orchestrator.ts # Portal dispatcher
│   │       │   ├── tailor.ts              # Resume rewriter (stub)
│   │       │   ├── logger.ts              # Markdown file logger
│   │       │   └── notion.ts              # Notion sync (stub)
│   │       ├── agents/
│   │       │   ├── linkedin.ts            # LinkedIn search (stub)
│   │       │   ├── naukri.ts              # Naukri search (stub)
│   │       │   ├── web-search.ts          # Web search (stub)
│   │       │   └── company-site.ts   ✅   # 90-company DB + ATS detection
│   │       └── browser/
│   │           ├── playwright.ts           # Browser pool manager
│   │           └── stealth.ts              # Anti-detection scripts
│   │
│   └── frontend/
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
│           ├── App.tsx                    # Routes
│           ├── pages/
│           │   ├── Dashboard.tsx          # Upload resume
│           │   ├── JobBoard.tsx           # Job listing
│           │   ├── JobDetail.tsx          # Job actions
│           │   ├── LogViewer.tsx          # Activity log
│           │   └── Settings.tsx     🆕   # Career DB config
│           ├── components/
│           │   ├── Layout.tsx
│           │   ├── ResumeUpload.tsx
│           │   ├── JobCard.tsx
│           │   ├── MatchBadge.tsx
│           │   ├── BatchActions.tsx
│           │   └── FilterBar.tsx
│           ├── hooks/
│           │   ├── useJobs.ts
│           │   ├── useResume.ts
│           │   └── useBatchSelect.ts
│           ├── services/
│           │   └── api.ts                 # API client
│           └── styles/
│               └── globals.css            # Tailwind + brutalist
│
└── logs/                   # Auto-generated activity logs
```

---

## 12. API Endpoints

### Resume
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/resume/upload` | Upload resume file(s) |
| `GET` | `/api/resume/:id` | Get parsed resume data |
| `GET` | `/api/resume/:id/skills` | Get extracted skills |
| `DELETE` | `/api/resume/:id` | Remove a resume |

### Job Search
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/jobs/search` | Search across portals + career sites with filters |
| `GET` | `/api/jobs/:id` | Get job detail |
| `POST` | `/api/jobs/batch` | Batch operation on selected jobs |
| `GET` | `/api/jobs/:id/redirect` | Get direct apply URL (may point to career site) |

### Resume Tailoring
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/tailor` | Tailor resume for a specific job |
| `GET` | `/api/tailor/:id/download` | Download tailored resume |

### Networking
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/network/linkedin-message` | Draft LinkedIn connection message |
| `POST` | `/api/network/referral-request` | Draft referral request |
| `POST` | `/api/network/email-hr` | Generate HR email draft + Gmail link |

### Career Sites 🆕
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/career-sites` | List all curated career sites |
| `POST` | `/api/career-sites/upload` | Upload .xlsx/.csv to add sites |

### Logs
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/logs` | List log entries |
| `GET` | `/api/logs/:date` | Get log for specific date |

---

## 13. Implementation Phases

### Phase 1: Project Scaffold ✅ **COMPLETE**
- npm workspaces monorepo
- TypeScript configs (3 packages)
- Express server with health check
- React Vite app with Tailwind + PWA + cartoon-brutalist design
- Shared types package with full data contracts
- **90 company career sites DB ingested** 🆕
- Company career site agent with ATS detection

### Phase 2: Resume Analyzer
**Duration**: 2-3 days
- File upload endpoint (multer)
- PDF parsing (pdf-parse)
- DOCX parsing (mammoth)
- Ollama service integration
- Skill/experience extraction prompts
- ChromaDB setup + embedding storage
- Resume management (CRUD)

### Phase 3: Job Search Engine
**Duration**: 3-4 days
- Playwright browser pool
- LinkedIn search agent (with filters)
- Naukri search agent (with filters)
- General web job search (Google for Jobs, Indeed India)
- Career site crawling (Playwright fallback for unknown companies)
- Job deduplication & normalization

### Phase 4: RAG Job Matching
**Duration**: 2-3 days
- JD embedding pipeline
- Similarity scoring (cosine distance)
- Match % calculation
- Ranking algorithm
- Role suggestion based on skills

### Phase 5: Dashboard UI
**Duration**: 3-4 days
- Resume upload component
- Job board with cards
- Match score badges
- Batch selection (checkboxes + Select All)
- Batch actions toolbar
- Job detail page
- Tailored resume preview + download
- Redirect buttons to job URLs
- Mobile-responsive + PWA install

### Phase 6: Networking Tools
**Duration**: 2 days
- LinkedIn connection message drafting
- Referral request generation
- Gmail compose URL generation
- Email draft templates

### Phase 7: Logging + Deployment
**Duration**: 2-3 days
- Markdown file logger
- Notion sync integration (optional)
- Vercel deployment (frontend)
- Render deployment (backend)
- Environment configuration
- Testing & bug fixes

---

## 14. Key Constraints & Mitigations

| Constraint | Mitigation |
|------------|------------|
| **No API keys** | Ollama local, ChromaDB local, Playwright for browsing |
| **LinkedIn bot detection** | HITL only for LinkedIn; no auto-apply; user manually applies after redirect |
| **Render free tier RAM (512MB)** | Lightweight Express, no Ollama on server; Ollama runs locally or on separate instance |
| **Naukri anti-scraping** | Playwright with stealth, human-like delays, rate limiting |
| **Resume parsing accuracy** | Multi-format support (PDF, DOCX), LLM-based extraction fallback |
| **Job deduplication** | URL-based dedup + fuzzy title/company matching |
| **Mobile performance** | PWA caching, lazy-loaded job cards, pagination |
| **Company career site coverage** | Curated 90-company DB from spreadsheet + user-uploadable .xlsx/.csv |

---

## 15. Career Sites Database Architecture 🆕

### Data Model
```typescript
interface CompanyCareerSite {
  name: string;          // e.g., "Accenture"
  careerUrl: string;     // e.g., "https://www.accenture.com/in-en/careers"
  category: "top" | "mid" | "startups";
}
```

### Lookup Logic
```typescript
// Case-insensitive fuzzy matching
function findCompanyCareerSite(companyName: string): CompanyCareerSite | undefined {
  const search = companyName.toLowerCase();
  return COMPANY_CAREER_SITES.find(
    (c) => c.name.toLowerCase() === search ||
          c.name.toLowerCase().includes(search) ||
          search.includes(c.name.toLowerCase())
  );
}
```

### ATS Platform Detection
| URL Pattern | ATS Platform | Direct URL Construction |
|------------|-------------|----------------------|
| `workday` / `myworkdayjobs` | Workday | `{careerUrl}/{jobSlug}/{jobId}` |
| `greenhouse` | Greenhouse | `{careerUrl}/jobs/{jobId}` |
| `lever.co` | Lever | `{careerUrl}/{jobId}` |
| `ashbyhq` | Ashby | `{careerUrl}/{jobId}` |
| `bamboohr` | BambooHR | `{careerUrl}/jobs/view.php?id={jobId}` |
| `successfactors` | SuccessFactors | `{careerUrl}` (no direct pattern) |
| `taleo` | Taleo | `{careerUrl}` (no direct pattern) |
| `icims` | iCIMS | `{careerUrl}` (no direct pattern) |

### Data Flow in Search
```
Search Request
  └── search-orchestrator.ts
       ├── company_portal source
       │    └── company-site.ts agent
       │         ├── findCompanyCareerSite(companyName) → match
       │         ├── detectAtsType(careerUrl) → "workday"
       │         ├── buildDirectJobUrl(careerUrl, jobId, title) → direct link
       │         └── return { careerPageUrl, jobUrl, atsType }
       │
       ├── linkedin source (Phase 3)
       ├── naukri source (Phase 3)
       └── web-search source (Phase 3)
```

---

## 16. Future Enhancements (v2+)

- Automated screening question answering (Naukri)
- Company ATS form pre-fill (Workday, Greenhouse, Lever)
- Interview scheduler integration
- Salary insights from Glassdoor/AmbitionBox
- Resume ATS score checker
- Email tracking for HR outreach
- Multi-user support
- Job application status tracking dashboard
- Career site auto-discovery (crawl company websites to find /careers pages)

---

## 17. Getting Started (Development)

```bash
# Prerequisites
# - Node.js 20+
# - Ollama (optional, for LLM features): ollama serve

# Clone & install
git clone https://github.com/Rinzlertron456/Agentic-Space.git
cd Agentic-Space
npm install

# Start Ollama (separate terminal, optional)
ollama pull mistral
ollama pull nomic-embed-text
ollama serve

# Start backend (apps/backend)
npm run dev -w apps/backend

# Start frontend (apps/frontend)
npm run dev -w apps/frontend

# Open http://localhost:5173
```

---

*Document maintained by the Agentic-Space team. Last updated: 2026-06-10 11:59 IST.*
*Changes this update: Added career sites database section (90 Indian companies), updated project structure, added new API endpoints, updated architecture diagram, updated HITL flow, added ATS detection table, updated tech choices.*
