# Agentic Space — Deployment Strategy

> **Version**: 1.0.0  
> **Updated**: 2026-06-12  
> **Status**: Living Document

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Local Development Setup](#3-local-development-setup)
4. [Production Architecture](#4-production-architecture)
5. [Containerized Deployment (Docker)](#5-containerized-deployment-docker)
6. [Hosted Deployment Options](#6-hosted-deployment-options)
7. [Environment Variables Reference](#7-environment-variables-reference)
8. [Build Pipeline](#8-build-pipeline)
9. [Ollama Hosting Strategies](#9-ollama-hosting-strategies)
10. [Database & Storage](#10-database--storage)
11. [Monitoring & Logging](#11-monitoring--logging)
12. [CI/CD Pipeline](#12-cicd-pipeline)
13. [Security Considerations](#13-security-considerations)
14. [Scaling Considerations](#14-scaling-considerations)
15. [Disaster Recovery](#15-disaster-recovery)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    DNS / Load Balancer                    │
└────────────────────┬────────────────────┬────────────────┘
                     │                    │
                     ▼                    ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   Frontend (React PWA)   │  │   Backend (Express API)   │
│   Port 5173 / 443        │  │   Port 3001 / 443         │
│   Vercel / Nginx / CDN   │  │   Render / Docker / VPS   │
├──────────────────────────┤  ├──────────────────────────┤
│ - React 18 + Vite        │  │ - Express + TypeScript    │
│ - Tailwind CSS            │  │ - Playwright (search)    │
│ - PWA (offline support)  │  │ - Ollama client           │
│ - react-router-dom       │  │ - ChromaDB client         │
│ - react-dropzone          │  │ - Notion API client       │
└─────────────┬────────────┘  └───────────┬──────────────┘
              │                            │
              │     ┌──────────────────────┤
              │     │                      │
              ▼     ▼                      ▼
       ┌──────────┐  ┌───────────┐  ┌──────────────┐
       │ Ollama   │  │ ChromaDB  │  │ Notion API   │
       │ Server   │  │ Vector DB │  │ (optional)   │
       │ Port 11434│  │ Port 8000 │  │              │
       └──────────┘  └───────────┘  └──────────────┘
```

---

## 2. Prerequisites

### Required Software (Local Development)

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | ≥18.0.0 | Runtime |
| pnpm | ≥9.0.0 | Package manager (workspaces) |
| Playwright | ≥1.48 | Browser automation for job search |
| Git | ≥2.30 | Version control |

### Required Services

| Service | Purpose | Default URL |
|---------|---------|-------------|
| Ollama | LLM for resume analysis, RAG embeddings, message drafting | `http://localhost:11434` |
| ChromaDB *(optional)* | Vector storage for resume embeddings | `http://localhost:8000` |

### Ollama Models

Pull these models before using the system:

```bash
ollama pull mistral           # Default LLM for generation
ollama pull nomic-embed-text  # Embeddings for RAG scoring
```

---

## 3. Local Development Setup

### Step 1: Clone & Install

```bash
git clone https://github.com/Rinzlertron456/Agentic-Space.git
cd Agentic-Space
pnpm install
```

### Step 2: Environment Configuration

Create `.env` in the project root:

```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=mistral
OLLAMA_EMBED_MODEL=nomic-embed-text

# ChromaDB (optional)
CHROMA_URL=http://localhost:8000

# Notion (optional — leave blank to disable)
NOTION_TOKEN=
NOTION_DATABASE_ID=

# Browser
BROWSER_HEADLESS=true
```

### Step 3: Start Services

**Terminal 1 — Backend:**
```bash
pnpm dev -w apps/backend
# → http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
pnpm dev -w apps/frontend
# → http://localhost:5173
```

**Terminal 3 — Ollama (if not running as service):**
```bash
ollama serve
# → http://localhost:11434
```

### Step 4: Verify

```bash
# Health check
curl http://localhost:3001/api/health
# → {"status":"ok","version":"1.0.0",...}

# Frontend
open http://localhost:5173
```

---

## 4. Production Architecture

```
                          ┌──────────┐
                          │  Custom   │
                          │  Domain   │
                          └────┬─────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
              ┌─────┴─────┐        ┌──────┴──────┐
              │  Vercel   │        │   Render    │
              │ (Frontend)│        │  (Backend)  │
              │  PWA +    │        │  Express +  │
              │  Static   │        │  Playwright │
              └─────┬─────┘        └──────┬──────┘
                    │                     │
                    │              ┌──────┴──────┐
                    │              │   Ollama    │
                    │              │  (Separate  │
                    │              │   Server)   │
                    │              └──────┬──────┘
                    │                     │
                    ▼                     ▼
              ┌──────────┐        ┌──────────────┐
              │   CDN    │        │   ChromaDB   │
              │ (Images) │        │  (Optional)  │
              └──────────┘        └──────────────┘
```

### Recommended Split

| Component | Platform | Resources | Estimated Cost |
|-----------|----------|-----------|----------------|
| Frontend (React PWA) | **Vercel** (Hobby) | 100 GB bandwidth, 6000 build min | Free |
| Backend (Express) | **Render** (Free) | 512 MB RAM, shared CPU | Free |
| Ollama | **RunPod / Vast.ai** or self-hosted | 8 GB RAM + GPU (T4 minimum) | ~$0.34/hr |
| ChromaDB | Embedded in backend OR **Railway** | 512 MB RAM | Free tier |
| Domain | **Namecheap / Cloudflare** | Standard domain | ~$10/year |
| Notion API | Built-in (opt-in) | — | Free |

---

## 5. Containerized Deployment (Docker)

### 5.1 Backend Dockerfile

```dockerfile
# apps/backend/Dockerfile
FROM node:22-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /app
COPY . .
RUN pnpm typecheck -w packages/shared
RUN pnpm build -w packages/shared
RUN pnpm build -w apps/backend

FROM node:22-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages

RUN npx playwright install chromium --with-deps

EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### 5.2 Docker Compose (Local + Production)

```yaml
# docker-compose.yml
version: "3.8"

services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped

  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma
    restart: unless-stopped

  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - OLLAMA_HOST=http://ollama:11434
      - CHROMA_URL=http://chromadb:8000
      - FRONTEND_URL=http://localhost:5173
      - BROWSER_HEADLESS=true
    depends_on:
      - ollama
      - chromadb
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
    ports:
      - "5173:5173"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  ollama_data:
  chroma_data:
```

### 5.3 Frontend Dockerfile (for self-hosting)

```dockerfile
# apps/frontend/Dockerfile
FROM node:22-alpine AS build
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-workspace.yaml .npmrc ./
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build -w apps/frontend

FROM nginx:alpine AS runner
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# apps/frontend/nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 6. Hosted Deployment Options

### 6.1 Vercel (Frontend) — Recommended

**Setup:**

```bash
npm i -g vercel
vercel --cwd apps/frontend
```

**Configuration** (`apps/frontend/vercel.json`):

```json
{
  "buildCommand": "cd ../.. && pnpm install && pnpm typecheck -w packages/shared && pnpm build -w apps/frontend",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://your-backend.onrender.com/api/$1" }
  ]
}
```

**Custom Domain:**
```bash
vercel domains add jobs.yourdomain.com
```

**Environment Variables:**
| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-backend.onrender.com` |

### 6.2 Render (Backend)

**Setup:**
1. Create a **Web Service** on Render
2. Connect your GitHub repo
3. Use these settings:

```yaml
# apps/backend/render.yaml (Render Blueprint)
services:
  - type: web
    name: agentic-space-backend
    runtime: node
    region: singapore
    plan: free
    buildCommand: pnpm install && pnpm typecheck -w packages/shared && pnpm build -w apps/backend
    startCommand: node apps/backend/dist/index.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: FRONTEND_URL
        value: https://jobs.yourdomain.com
      - key: OLLAMA_HOST
        sync: false  # User must set
      - key: BROWSER_HEADLESS
        value: "true"
```

> **⚠️ Render Free Tier Limitations:**
> - 512 MB RAM — sufficient for Express + Playwright but NOT Ollama
> - Idles after 15 min of inactivity (use Render's "cron job" add-on or UptimeRobot to ping every 10 min)
> - 90-day inactivity limit for free PostgreSQL — use SQLite (embedded) instead

### 6.3 VPS (Self-Hosted) — Full Control

**Recommended Specs:**

| Provider | Plan | RAM | CPU | Storage | GPU | Est. Cost |
|----------|------|-----|-----|---------|-----|-----------|
| Hetzner | CX22 | 4 GB | 2 vCPU | 40 GB NVMe | — | ~€8/mo |
| RunPod | GPU Pod | 16 GB | 6 vCPU | 50 GB | T4 16GB | ~$0.34/hr |
| Vast.ai | RTX 3090 | 24 GB | 8 vCPU | 50 GB | RTX 3090 | ~$0.20/hr |
| AWS EC2 | g4dn.xlarge | 16 GB | 4 vCPU | 125 GB | T4 16GB | ~$0.53/hr |

**Manual Setup Script:**

```bash
# Ubuntu 22.04+
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git docker.io docker-compose nginx certbot

# Install pnpm
npm install -g pnpm

# Clone project
git clone https://github.com/Rinzlertron456/Agentic-Space.git
cd Agentic-Space
pnpm install

# Install Playwright
npx playwright install chromium --with-deps

# Build
pnpm typecheck -w packages/shared
pnpm build -w packages/shared
pnpm build -w apps/backend
pnpm build -w apps/frontend
```

**Nginx Reverse Proxy:**

```nginx
# /etc/nginx/sites-available/agentic-space
server {
    listen 80;
    server_name jobs.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name jobs.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/jobs.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jobs.yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Increase timeout for long-running searches
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # Ollama (if on same machine — keep internal)
    location /ollama/ {
        proxy_pass http://localhost:11434/;
        proxy_set_header Host $host;
        proxy_read_timeout 300s;
    }
}
```

**SSL with Certbot:**
```bash
sudo certbot --nginx -d jobs.yourdomain.com
```

**Systemd Service:**

```ini
# /etc/systemd/system/agentic-backend.service
[Unit]
Description=Agentic Space Backend
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/home/deploy/Agentic-Space
ExecStart=/usr/bin/node apps/backend/dist/index.js
Environment=NODE_ENV=production
Environment=OLLAMA_HOST=http://localhost:11434
Environment=PORT=3001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now agentic-backend
```

---

## 7. Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Backend HTTP port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `FRONTEND_URL` | No | `http://localhost:5173` | CORS origin for frontend |
| `OLLAMA_HOST` | Yes* | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | No | `mistral` | LLM model for generation |
| `OLLAMA_EMBED_MODEL` | No | `nomic-embed-text` | Model for embeddings |
| `CHROMA_URL` | No | `http://localhost:8000` | ChromaDB vector DB URL |
| `NOTION_TOKEN` | No | — | Notion integration token |
| `NOTION_DATABASE_ID` | No | — | Notion database ID for logging |
| `BROWSER_HEADLESS` | No | `true` | Run Playwright in headless mode |

> *Ollama host is required for resume analysis, RAG scoring, and message generation. The backend starts without it but returns degraded responses.

---

## 8. Build Pipeline

### 8.1 Monorepo Build Order

Due to `pnpm workspace` dependencies, packages must be built in order:

```
packages/shared  →  compiles first (types, constants)
apps/backend     →  depends on shared
apps/frontend    →  depends on shared
```

### 8.2 Commands

```bash
# Full build (all packages)
pnpm build -w packages/shared
pnpm build -w apps/backend
pnpm build -w apps/frontend

# Type checking (non-blocking)
pnpm typecheck -w packages/shared
pnpm typecheck -w apps/backend
pnpm typecheck -w apps/frontend

# Development
pnpm dev -w apps/backend
pnpm dev -w apps/frontend
```

### 8.3 Build Outputs

```bash
apps/backend/dist/index.js       # Compiled Express server
apps/frontend/dist/index.html    # Static PWA bundle
packages/shared/dist/index.js    # Shared types
```

---

## 9. Ollama Hosting Strategies

Ollama is the **most critical dependency** and the hardest to host. Choose based on your budget and latency requirements.

| Strategy | Setup | Cost | Latency | Maintenance |
|----------|-------|------|---------|-------------|
| **Local machine** | `ollama serve` | Free (your hardware) | Instant (localhost) | Your issue |
| **Dedicated VPS + GPU** | GPU cloud instance + Docker | $20-250/mo | Good (same region) | Full control |
| **Serverless/API** | OpenAI / Together AI API | Pay-per-token | Fast | None |

### 9.1 Local Machine (Development Only)

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull models
ollama pull mistral
ollama pull nomic-embed-text

# Run
ollama serve
```

### 9.2 GPU Cloud Instance (Production)

**RunPod Example:**

```bash
# Deploy a RunPod template with Ollama pre-installed
# Template: "ollama-webui-lite" (T4 GPU, 16 GB VRAM)

ssh -L 11434:localhost:11434 root@your-runpod-instance

ollama pull mistral
ollama pull nomic-embed-text

# Update .env on your backend server:
OLLAMA_HOST=http://your-runpod-instance:11434
```

**Cloudflare Tunnel (No Public IP):**

```bash
# On the GPU instance
cloudflared tunnel --url http://localhost:11434

# Get the public URL, set as OLLAMA_HOST
```

### 9.3 OpenAI API Fallback (No GPU Needed)

To eliminate GPU dependency entirely, replace `services/ollama.ts` with OpenAI-compatible endpoints:

```typescript
// Alternative: OpenAI-based implementation
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generate(prompt: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",  // Fast, cheap, no GPU
    messages: [{ role: "user", content: prompt }],
  });
  return completion.choices[0].message.content || "";
}

export async function embed(text: string): Promise<number[]> {
  const result = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return result.data[0].embedding;
}
```

**Estimated OpenAI Costs:**
- Resume analysis: ~5-10K tokens → ~$0.0003/resume
- RAG embedding: ~2K tokens → ~$0.00002/job
- Message drafting: ~1K tokens → ~$0.00003/message
- **Monthly estimate (500 resumes / 10K jobs / 1K messages): ~$5-10**

---

## 10. Database & Storage

### 10.1 Current Storage (File-based — No Database Required)

| Data | Storage Method | Location |
|------|---------------|----------|
| Resumes (JSON) | In-memory Map + JSON file | `uploads/*.json` |
| Resume embeddings | ChromaDB (optional) | Chroma server |
| Logs | Markdown files | `logs/YYYY-MM-DD.md` |
| Uploaded PDFs/DOCX | Temp files (cleaned) | `uploads/` |

### 10.2 SQLite Upgrade Path (Zero Infrastructure)

For persistence beyond a single process:

```bash
npm install better-sqlite3 @types/better-sqlite3
```

```typescript
// services/db.ts
import Database from "better-sqlite3";
import path from "path";
import { config } from "../config.js";

const db = new Database(path.join(config.paths.data, "agentic.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS resumes (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS search_results (
    id TEXT PRIMARY KEY,
    resume_id TEXT NOT NULL,
    jobs TEXT NOT NULL,
    filters TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
```

### 10.3 PostgreSQL (For Team Deployments)

If deploying for multiple users or requiring persistent search history:

```bash
# Render provides free PostgreSQL (limited to 90 days)
# OR use Supabase (free tier: 500 MB)
```

Schema additions would be needed for:
- User accounts and authentication
- Session management
- Persistent job saves/bookmarks
- Search history
- Application tracking

---

## 11. Monitoring & Logging

### 11.1 Current Logging

| Log Type | Format | Location | Retention |
|----------|--------|----------|-----------|
| Agent actions | Markdown with timestamps | `logs/YYYY-MM-DD.md` | Forever (manual cleanup) |
| Notion (opt-in) | Notion database pages | Your Notion workspace | Forever |
| Console | `console.log` | Stdout | Session only |

### 11.2 Production Monitoring Stack

```yaml
# Add to docker-compose.yml
services:
  # ... existing services ...

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped
```

**Key Metrics to Track:**
- Search latency (target: <30s for 4 agents)
- RAG scoring latency (target: <5s for 50 jobs)
- Ollama response times (target: <3s per generation)
- API error rate (target: <1%)
- Active users / searches per hour

### 11.3 Health Check Endpoints

```bash
GET /api/health
# → {"status":"ok","version":"1.0.0","timestamp":"..."}

GET /api/health/ollama
# → {"status":"ok","models":["mistral","nomic-embed-text"]}

GET /api/health/chroma
# → {"status":"ok"} or {"status":"unavailable","error":"..."}
```

---

## 12. CI/CD Pipeline

### 12.1 GitHub Actions (Example)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck -w packages/shared
      - run: pnpm typecheck -w apps/backend
      - run: pnpm typecheck -w apps/frontend

  build:
    needs: typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build -w packages/shared
      - run: pnpm build -w apps/backend
      - run: pnpm build -w apps/frontend

  deploy-backend:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Render
        run: curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}

  deploy-frontend:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: --prod
```

---

## 13. Security Considerations

### 13.1 Authentication

The current system has **no user authentication** — it operates as a single-user tool. For multi-user deployments:

```bash
npm install jsonwebtoken bcrypt
```

Add JWT middleware to `apps/backend/src/index.ts`:

```typescript
import jwt from "jsonwebtoken";

app.use("/api", (req, res, next) => {
  // Skip auth for health and login
  if (req.path === "/health" || req.path === "/auth/login") return next();

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    (req as any).user = jwt.verify(token, process.env.JWT_SECRET!);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
});
```

### 13.2 Playwright Security

Playwright opens external websites (LinkedIn, Naukri, Indeed). In production:

- **Run in a sandboxed environment** (Docker container without `--privileged`)
- **Disable screenshots** unless debugging
- **Rate-limit searches** to avoid being flagged as a bot
- **Respect robots.txt** and terms of service
- **Consider rotating user agents** to avoid blocking

### 13.3 Data Security

| Concern | Mitigation |
|---------|-----------|
| Resume storage | File-based, no cloud. Use encrypted volume. |
| API keys (Ollama, Notion) | Environment variables, never committed. |
| Uploaded files | Deleted immediately after processing. |
| Log data | Markdown files on local disk. No user PII in logs. |

---

## 14. Scaling Considerations

### 14.1 Current Limits

| Resource | Limit | Bottleneck |
|----------|-------|-----------|
| Resume uploads | 10 MB per file | Multer config (adjustable) |
| Concurrent searches | 4 agents × timeout | Playwright + network |
| RAG batch size | 5 jobs per batch | Ollama embedding throughput |
| Max search results | 50 results | Configurable in `SearchFilters` |

### 14.2 Scaling Strategies

| Scenario | Strategy |
|----------|----------|
| More users | Add JWT auth, per-user DB isolation |
| More search volume | Cache results, deduplicate requests |
| Faster RAG | Increase batch size, parallelize Ollama requests |
| More career sites | Add agents via the `search-orchestrator` switch/case |
| Heavy LLM usage | Switch to OpenAI API (no GPU bottleneck) |

---

## 15. Disaster Recovery

### 15.1 Backup Strategy

| Data | Backup Method | Frequency |
|------|--------------|-----------|
| `.env` | Password manager / encrypted vault | On change |
| `logs/*.md` | `tar -czf logs-backup.tar.gz logs/` | Daily (cron) |
| `uploads/*.json` | Same as logs | Daily (cron) |
| Resumes in ChromaDB | `chroma export` | Weekly |
| Git repository | `git push` | Every commit |

### 15.2 Recovery Steps

```bash
# Full recovery on new machine:
git clone <repo>
cp .env.backup .env
pnpm install
pnpm build -w packages/shared
pnpm build -w apps/backend
pnpm build -w apps/frontend
npx playwright install chromium --with-deps
tar -xzf logs-backup.tar.gz
pnpm dev -w apps/backend &
pnpm dev -w apps/frontend &
```

### 15.3 Fallback Modes

| Service Failure | Degraded Behavior |
|----------------|-------------------|
| Ollama unavailable | Resume analysis fails. RAG defaults to keyword-only. Networking tools unavailable. Backend still serves job search. |
| ChromaDB unavailable | Embedding storage skipped. RAG scoring still works (direct Ollama calls). |
| Notion unavailable | Logs written to local files only (`logs/*.md`). No sync error. |
| Playwright fails | Search agent returns error for that source. Other sources still work. |

---

## Quick Reference: Deployment Decision Tree

```
Do you have a GPU machine nearby?
├── YES → Run Ollama locally + Docker Compose everything
└── NO
    ├── Can you rent one? → RunPod / Vast.ai for Ollama + Vercel+Render
    └── NO → Switch to OpenAI API (no GPU needed)
                  → Deploy frontend on Vercel, backend on Render

Do you need persistent storage?
├── NO (single user) → File-based storage is fine
└── YES (multi-user) → Add SQLite or PostgreSQL
