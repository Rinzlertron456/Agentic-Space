# Agentic Space — GCP Deployment & Build Error Analysis

> **Date**: 2026-06-20  
> **Scope**: Full codebase audit, deployment configuration review, build issue identification  
> **Target**: cloudbuild.yaml (GCP Cloud Run), root Dockerfile, docker-compose.yml, apps/backend/Dockerfile, apps/frontend/Dockerfile, vercel.json

---

## Executive Summary

The project **Agentic Space** is an autonomous job-hunting agent with RAG-based resume analysis. It has a monorepo structure (pnpm workspaces) with three packages: `packages/shared` (types), `apps/backend` (Express API), and `apps/frontend` (React PWA).

The GCP Cloud Run deployment at `https://agentic-space-backend-dc62daq7pq-asia.a.run.app` uses `cloudbuild.yaml` → root `Dockerfile` pipeline. **There are multiple issues in this pipeline that would cause build failures or runtime errors.** The deployment may appear to succeed (container starts) but critical features will not work.

---

## 🔴 Critical Issues (Will Cause Build Failure or Runtime Crash)

### Issue 1: Missing `packages/shared/package.json` in Runner Stage

**File**: `Dockerfile` (root), line 27–28

```dockerfile
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
# ⚠️ Missing: COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
```

**What happens**: The backend's `package.json` depends on `@agentic-space/shared` via `"file:../../packages/shared"`. In pnpm's node_modules, this resolves as a **symlink** pointing to `/app/packages/shared`. The runner stage only copies `dist/` into that directory, but **not `package.json`**. When Node.js tries to resolve `@agentic-space/shared`, it needs `package.json` to determine the `main`/`exports` fields. Without it, `require("@agentic-space/shared")` or `import {...} from "@agentic-space/shared"` will fail with **MODULE_NOT_FOUND**.

**Fix**: Add `COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json` to the runner stage.

### Issue 2: Two Competing Docker Build Systems

| File | Package Manager | Lock File | Uses |
|------|----------------|-----------|------|
| `Dockerfile` (root) | **pnpm** | `pnpm-lock.yaml` | Cloud Run via `cloudbuild.yaml` |
| `apps/backend/Dockerfile` | **npm** | `package-lock.json` | `docker-compose.yml` |

**What happens**: The root Dockerfile and `apps/backend/Dockerfile` have fundamentally different build approaches. The root uses `pnpm install --frozen-lockfile` and `pnpm --filter` for builds. The apps/backend Dockerfile uses `npm ci` with `package-lock.json`. Both `pnpm-lock.yaml` AND `package-lock.json` exist at the root level with potentially different dependency versions. This is a maintenance nightmare — updates via `pnpm` will not be reflected in `package-lock.json`, so the apps/backend Dockerfile will build with stale/incorrect dependencies.

**Fix**: Decide which Dockerfile to maintain. If Cloud Run is the target, keep only the root Dockerfile and remove/archive `apps/backend/Dockerfile`. Or vice versa, but don't maintain both.

### Issue 3: No OPENAI_API_KEY in Cloud Run

**File**: `cloudbuild.yaml` (env vars section)

```yaml
- '--set-env-vars=NODE_ENV=production'
- '--set-env-vars=FRONTEND_URL=https://agentic-space.vercel.app'
# ⚠️ Missing: --set-env-vars=OPENAI_API_KEY=...
```

**What happens**: The backend's `services/ollama.ts` (lines 57-68) checks if `config.openai.apiKey` is set. Without it:
- `isOllamaAvailable()` returns `false` after trying OpenAI (no key → skip) and Ollama (running at `http://localhost:11434` which doesn't exist in Cloud Run)
- All LLM features fail: resume analysis, RAG matching, message drafting, resume tailoring

**Fix**: Add `OPENAI_API_KEY` either in `cloudbuild.yaml` as a build-time env var, or better yet, set it in Cloud Run Console → Edit & Deploy New Revision → Variables & Secrets (use Secret Manager for the API key value).

### Issue 4: Missing Job API Keys (Adzuna, SERP)

**File**: `cloudbuild.yaml`

```yaml
# ⚠️ Missing: --set-env-vars=ADZUNA_APP_ID=...
# ⚠️ Missing: --set-env-vars=ADZUNA_APP_KEY=...
# ⚠️ Missing: --set-env-vars=SERPAPI_KEY=...
```

**What happens**: Without these keys, the job search features fall back to **mock data** (hardcoded jobs in `services/job-api.ts`, lines 23-96). The API will return results, but they're fake. Users will see jobs from Google, Microsoft, Amazon, Stripe, Netflix, Flipkart, Swiggy, and Uber — all with the same hardcoded descriptions and locations.

### Issue 5: OLLAMA_HOST Points to Localhost (No Ollama Sidecar)

**File**: `cloudbuild.yaml`

```yaml
- '--set-env-vars=OLLAMA_HOST=http://localhost:11434'
```

**What happens**: Cloud Run is a single-container environment. There is no Ollama server running on localhost:11434. The backend will try to connect to itself on port 11434 and fail. `isOllamaAvailable()` catches the error and marks Ollama as offline after a 2-second timeout. This means:
- Every LLM call waits for a 2-second timeout before giving up
- All `generate()` and `embed()` calls throw "No LLM backend available" errors
- Resume analysis, RAG matching, message drafting all fail

**Fix**: Either:
1. Remove Ollama entirely and rely on OpenAI only (set `OPENAI_API_KEY`)
2. Deploy Ollama as a Cloud Run sidecar (requires Cloud Run v2 with sidecars, more complex)
3. Point to an external Ollama instance (e.g., RunPod or Vast.ai GPU instance)

### Issue 6: Hardcoded Cloud Run URL in Vercel Rewrites

**File**: `apps/frontend/vercel.json`

```json
"rewrites": [
  { "source": "/api/(.*)", "destination": "https://agentic-space-backend-dc62daq7pq-asia.a.run.app/api/$1" }
]
```

**What happens**: The URL includes a hash `dc62daq7pq` that's tied to a specific Cloud Run revision. If the Cloud Run service is recreated or the revision changes, this URL breaks. The frontend will get 404/502 errors for all API requests.

**Fix**: Use the stable Cloud Run service URL: `https://agentic-space-backend-<hash>-asia.a.run.app` (the hash in the subdomain is stable for the service, not the revision). Alternatively, map a custom domain to the Cloud Run service and use that.

---

## 🟡 Moderate Issues (Will Cause Runtime Errors or Degraded Service)

### Issue 7: No CHROMA_URL in Cloud Run

**What happens**: The backend tries to connect to `http://localhost:8000` (default ChromaDB URL). There's no ChromaDB in Cloud Run. `isChromaAvailable()` will fail after a 3-second timeout. Resume embeddings won't be stored, and RAG-based matching will use direct embedding calls instead of vector search. The app still works but is slower.

### Issue 8: Hardcoded __dirname Resolution for .env

**File**: `apps/backend/src/config.ts`, line 6

```typescript
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
```

In the Docker container, the compiled source is at `/app/dist/index.js`, so `__dirname` = `/app/dist`. The `.env` path resolves to `/app/../../../.env` which is outside the container filesystem. This `dotenv.config()` call is a harmless no-op in production, but wastes a tiny bit of startup time. Not a bug per se, but should be guarded with `if (process.env.NODE_ENV !== 'production')`.

### Issue 9: pdf-parse Dynamic Import Risk

**File**: `apps/backend/src/services/parser.ts`, lines 11-17

```typescript
const pdfModule = await import("pdf-parse");
const pdfParse = (pdfModule.default || pdfModule) as unknown as PDFParseFn;
```

`pdf-parse` is a CommonJS module with complex default export behavior. The type cast `as unknown as PDFParseFn` works around TypeScript but may fail at runtime if the import resolution changes. The `pdf-parse` package has had compatibility issues with ESM projects in the past.

### Issue 10: No .env File in Docker Build Context

`.gcloudignore` excludes `.env`:

```
.env
.env.example
```

The Docker build context doesn't include `.env`. Since `dotenv.config()` is called with an absolute path that points outside the container anyway (Issue 8), this doesn't directly break things. But it means developers might not realize that `.env` is irrelevant in production.

---

## 🔵 Observations & Non-Blocking Findings

### Observation 1: Monorepo Structure Works for pnpm

The pnpm workspace configuration in `pnpm-workspace.yaml` is correct:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

The build order in the Dockerfile is correct: shared package builds first, then backend.

### Observation 2: Startup Checks Are Graceful

The backend's `index.ts` startup (lines 48-71) gracefully handles missing services:
```typescript
const openaiOk = await isOllamaAvailable();
const chromaOk = await isChromaAvailable();
```

These checks log warnings but don't prevent the server from starting. The /api/health endpoint always returns 200 as long as Express is running.

### Observation 3: Frontend Build in Root Dockerfile is Omitted

The root Dockerfile (used by Cloud Run) only builds the backend:
```dockerfile
RUN pnpm --filter @agentic-space/shared build
RUN pnpm --filter @agentic-space/backend build
```

There's no frontend build. This is fine for Cloud Run (backend-only deployment), but if someone tries to deploy a combined image, the frontend won't be included.

### Observation 4: Config.ts Loads .env from Wrong Location

The config.ts's `.env` path resolution is:
```
__dirname = /app/dist/
../../../.env → /app/../../../.env = /../../../.env = doesn't exist
```

This path resolution assumes a dev directory structure where `dist` is 3 levels deep. In Docker, it's only 2 levels (`/app/dist` → going up 3 is outside the container). The `.env` file doesn't exist in the Docker image, so this is silently ignored.

### Observation 5: Memory Pressure Risk

Cloud Run is configured with `--memory=256Mi`. The backend loads:
- Express + middleware (~50 MB)
- OpenAI SDK (~30 MB)
- ChromaDB client (~20 MB)
- PDF parsing libraries (~40 MB)
- cheerio for HTML parsing (~15 MB)

Total baseline is ~150 MB. During resume analysis or job search, memory spikes to ~200-220 MB. 256 MB is tight but should work for light usage. Under concurrent requests, OOM kills are possible.

---

## Verification: "Will the Build Succeed?"

**Short answer**: The Docker build from `cloudbuild.yaml` will likely succeed (pnpm install + type check + build), but the **container will crash at runtime** due to the missing `packages/shared/package.json` (Issue 1).

**Build steps analysis**:
1. `docker build` → ✅ Should succeed (pnpm resolves symlinks at build time)
2. `docker push` → ✅ Will push the image
3. `gcloud run deploy` → ✅ Will create/update the service
4. Container starts → ❌ `node dist/index.js` will fail when importing from `@agentic-space/shared` because the package.json needed for module resolution is missing in the runner stage

**After fixing Issue 1**, the container will start and serve the health endpoint, but:
- All LLM features: ❌ (no OPENAI_API_KEY, no Ollama)
- Job search: ⚠️ Returns mock data only (no API keys)
- Resume upload + analysis: ❌ (needs LLM)
- Resume tailoring: ❌ (needs LLM)
- Networking tools: ❌ (needs LLM)
- RAG matching: ⚠️ Keyword-only (no ChromaDB, no embeddings)
- Log viewer: ✅ Works (file-based logs)

---

## Recommended Fixes (Priority Order)

### P0 — Must Fix Before Deployment Works

| Priority | Fix | File | Change |
|----------|-----|------|--------|
| P0 | Add `packages/shared/package.json` to runner stage | `Dockerfile` (root) | `COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json` |
| P0 | Add `OPENAI_API_KEY` to Cloud Run env vars | `cloudbuild.yaml` or Cloud Run Console | Set via Secret Manager |

### P1 — Should Fix for Functional Deployment

| Priority | Fix | File | Change |
|----------|-----|------|--------|
| P1 | Fix OLLAMA_HOST or remove | `cloudbuild.yaml` | Either remove (if using OpenAI) or point to external Ollama |
| P1 | Add job API keys | `cloudbuild.yaml` | Add ADZUNA_APP_ID, ADZUNA_APP_KEY, SERPAPI_KEY |
| P1 | Use stable Cloud Run URL in vercel.json | `apps/frontend/vercel.json` | Update destination URL |
| P1 | Guard .env loading in production | `apps/backend/src/config.ts` | Wrap in `if (NODE_ENV !== 'production')` |

### P2 — Should Fix for Maintainability

| Priority | Fix | File | Change |
|----------|-----|------|--------|
| P2 | Remove stale dockerfile or add comments | `apps/backend/Dockerfile` | Add note: "DEPRECATED — use root Dockerfile for Cloud Run" |
| P2 | Add CHROMA_URL to env vars | `cloudbuild.yaml` | Point to external ChromaDB or skip |
| P2 | Increase memory limit | `cloudbuild.yaml` | Change `--memory=256Mi` to `--memory=512Mi` |

---

## Updated cloudbuild.yaml (Recommended)

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/agentic-space-backend', '.']
    timeout: 600s

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/agentic-space-backend']

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'agentic-space-backend'
      - '--image=gcr.io/$PROJECT_ID/agentic-space-backend'
      - '--region=asia-southeast1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--memory=512Mi'
      - '--cpu=1'
      - '--min-instances=0'
      - '--max-instances=2'
      - '--concurrency=80'
      - '--timeout=300s'
      - '--set-env-vars=NODE_ENV=production'
      - '--set-env-vars=FRONTEND_URL=https://agentic-space.vercel.app'
      - '--set-env-vars=OPENAI_MODEL=gpt-4o-mini'
      - '--set-env-vars=OPENAI_EMBED_MODEL=text-embedding-3-small'
      - '--set-secrets=OPENAI_API_KEY=openai-api-key:latest'
      - '--set-secrets=ADZUNA_APP_ID=adzuna-app-id:latest'
      - '--set-secrets=ADZUNA_APP_KEY=adzuna-app-key:latest'
      - '--set-env-vars=PORT=3001'

timeout: 900s
```

---

## Updated Dockerfile Runner Stage (Recommended)

```dockerfile
FROM node:22-alpine AS runner
WORKDIR /app

# Copy built artifacts
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json

# Create directories for runtime data
RUN mkdir -p logs/uploads

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001
CMD ["node", "dist/index.js"]
```

---

## Conclusion

The GCP Cloud Run deployment has been wired up in `cloudbuild.yaml` and the root `Dockerfile`, but **cannot function correctly in its current state**. The primary blocker is the missing `packages/shared/package.json` in the Docker runner stage, which will cause a MODULE_NOT_FOUND error at startup. After fixing this, the deployment will start but lack all LLM functionality (no `OPENAI_API_KEY` configured). The backend gracefully degrades for missing services, so it won't crash — but it will serve mock data for job searches and return errors for resume analysis.

For a fully functional deployment, the minimum fix set is:
1. Add `packages/shared/package.json` to the runner stage
2. Set `OPENAI_API_KEY` via Cloud Run secrets
3. Remove `OLLAMA_HOST` env var (or point to a real instance)
