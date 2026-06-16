# Agentic Space — Memory Exceedance Investigation Report

## Issue Summary

**Render reported that `agentic-space-backend-v2` exceeded its memory limit** (512 MB on the Free plan). After deep analysis of the full codebase, the root cause is **not primarily Ollama nor RAG** — it's a combination of **Playwright/Chromium memory leaks, unbounded concurrency, and cascading connection failures** to unreachable services. The Ollama and ChromaDB connection failures are secondary contributors that compound the problem.

---

## 1. Memory Consumption: Component-by-Component Breakdown

| Component | Memory Usage | Persistence | Notes |
|-----------|-------------|-------------|-------|
| **Playwright Chromium Browser** | 200-400 MB | **Singleton — never closes** | Biggest single consumer. Launched at first search, lives forever. |
| **Playwright Pages (per search)** | ~50-100 MB each | Created per agent, closed in `finally` | 3-4 concurrent pages during search = 200-400 MB extra on top of browser |
| **Ollama HTTP Connections** | Minimal (failed connections) | Ephemeral | Not actually running on Render, so every call fails after timeout |
| **ChromaDB Connections** | Minimal | Ephemeral | Also not running on Render, every call fails |
| **Tailor Cache** | Variable, up to ~5 MB | In-memory Map (500 entries max) | Negligible |
| **Express + Node.js runtime** | ~30-50 MB | Persistent | Baseline |
| **Error objects/garbage from failures** | Accumulates temporarily | GC-d when under pressure | Contributes to heap fragmentation |

**Estimated total during a job search:** 500-900 MB → **Exceeds the 512 MB limit by a wide margin.**

---

## 2. Root Cause Analysis

### Primary Cause: Playwright Singleton Browser Never Closes

**File**: `apps/backend/src/browser/playwright.ts` (lines 1-44)

```typescript
let browser: Browser | null = null;
let context: BrowserContext | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: config.browser.headless,
      args: ["--disable-blink-features=AutomationControlled", "--no-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return browser;
}
```

The browser is a **module-level singleton** that never closes. Once created, it lives for the entire server lifetime. On Render's 512 MB Free plan, this is fatal:

- A headless Chromium process typically uses **200-350 MB** just sitting idle
- During searches, each `newPage()` call adds 50-100 MB per active page
- The `closeBrowser()` function exists but is **never called** anywhere in the codebase
- Even after all search pages close, the browser stays open, reserving 200+ MB forever

### Secondary Cause: 4 Parallel Playwright Pages During Search

**File**: `apps/backend/src/services/search-orchestrator.ts` (lines 85-101)

```typescript
for (const source of mergedFilters.sources) {
  switch (source) {
    case "linkedin": searches.push(searchLinkedInSource(...)); break;
    case "naukri":   searches.push(searchNaukriSource(...)); break;
    case "indeed":
    case "google_jobs": searches.push(searchWebSource(...)); break;
    case "company_portal": searches.push(searchCompanyPortals(...)); break;
  }
}
await Promise.allSettled(searches);

// Then RAG scoring with 5-job batches:
const { results: scoredJobs } = await searchWithRag(resumeId, unique);
```

The orchestrator:
1. Fires 3-4 Playwright-based searches **simultaneously** via `Promise.allSettled`
2. Each search opens 1-2 pages → potentially 4-6 Playwright pages concurrently
3. After all search pages close, immediately starts **RAG batch scoring**
4. RAG scoring calls `embed()` for each job — two Ollama HTTP calls per job

With 4 active Chromium pages + the persistent browser + in-flight HTTP connections, memory spikes well past 512 MB.

### Tertiary Cause: Cascading Connection Failures to Missing Services

**Ollama** is configured as `http://localhost:11434` in render.yaml, but **no Ollama instance is deployed on Render.** ChromaDB is similarly unreachable at `http://localhost:8000`.

Every operation that hits these services:

1. **Ollama `generate()`** — No timeout configured. A failed connection to a non-existent localhost service typically times out in 30-120 seconds (OS TCP default).
2. **Ollama `embed()`** — Same issue. Called 2× per job during RAG matching.
3. **ChromaDB `ChromaClient()`** — Created at module import time with no connection check.
4. **`checkOllama()`** in index.ts — Has a 2.5s timeout via `AbortController`, but this is only on diagnostics endpoint. The actual service calls have NO timeout.

During a job search of 50 jobs, `matchResumeToJob` is called 50 times, each calling `embed()` twice = **100 HTTP calls to a non-existent Ollama**. Each takes 30+ seconds to fail, and the failed promises pile up in memory.

### Quaternary Cause: Error Object Accumulation

Every failed Ollama call creates multiple error objects:
- HTTP fetch error objects
- `console.error` string formats (buffer)  
- Logger entries (file writes + Notion attempts)
- Caught exceptions in retry logic

These accumulate in the V8 heap and, under memory pressure, garbage collection becomes less effective, accelerating the crash.

---

## 3. Build & Deploy Configuration Issues

### Dockerfile (apps/backend/Dockerfile)
```dockerfile
FROM base AS runner
WORKDIR /app
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
RUN npx playwright install chromium --with-deps
```

- Installs Chromium (large: ~300+ MB on disk) into the production image
- No `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` option — always installs

### render.yaml
```yaml
plan: free
buildCommand: npm install --include=dev && npx playwright install chromium && npm run build -w packages/shared && npm run build -w apps/backend
startCommand: npm run start -w apps/backend
envVars:
  - key: OLLAMA_HOST
    value: http://localhost:11434
  - key: PLAYWRIGHT_BROWSERS_PATH
    value: "0"
```

- **OLLAMA_HOST set to localhost but no Ollama on Render** — This is the critical misconfiguration. The backend is configured to talk to a local Ollama that doesn't exist.
- `PLAYWRIGHT_BROWSERS_PATH = "0"` — This is the correct Playwright setting for container environments.
- `plan: free` — 512 MB RAM, shared CPU. Idles after 15 minutes of inactivity.
- Region: Singapore — Acceptable for India.

### Root vercel.json
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://agentic-space-backend-v2.onrender.com/api/$1" }
  ]
}
```
- Frontend rewrites all `/api/*` requests to the Render backend
- Works for HTTP routing, but adds latency

---

## 4. Is the Render URL Active?

Based on the code analysis, the backend likely **starts but immediately encounters problems**:

1. The server starts on port 3001 (configured)  
2. Express boots with all middleware
3. On first `GET /api/health` → responds `{"status":"ok"}` without touching Ollama
4. On first `POST /api/resume/upload` → tries to contact `http://localhost:11434` for analysis → **fails after timeout** → falls back to regex extraction
5. On first `POST /api/jobs/search` → **launches Playwright Chromium** (200+ MB allocated) → opens 3-4 pages (another 200-400 MB) → then tries RAG with 100 Ollama calls → **memory exceeded → process killed by Render**

The server is **technically running** but the first job search likely causes an OOM (Out of Memory) kill. After Render restarts it (auto-recovery), the same cycle repeats.

---

## 5. Required Fixes

### Fix 1 (Critical): Add Ollama Browser/Process Timeout or Remove Playwright

**Option A — Close browser after idle period** (recommended):
Modify `playwright.ts` to close the browser after a period of inactivity (e.g., 2 minutes):

```typescript
let browser: Browser | null = null;
let browserTimer: NodeJS.Timeout | null = null;
const BROWSER_IDLE_MS = 120_000;

export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  // Reset the idle timer on every access
  if (browserTimer) clearTimeout(browserTimer);
  browserTimer = setTimeout(async () => {
    if (browser) await closeBrowser();
  }, BROWSER_IDLE_MS);
  return browser;
}
```

**Option B — Launch/close browser per search** (simplest):
```typescript
export async function getBrowser(): Promise<Browser> {
  return chromium.launch({ headless: true });
}
// Always call closeBrowser() in a finally block
```

**Option C — Replace Playwright with cheerio/fetch** (most efficient):
For job search scraping, replace the Playwright-based LinkedIn/Naukri agents with lightweight HTTP+cheerio. This eliminates Chromium entirely. LinkedIn requires JS rendering though, so may not work.

**Recommendation**: Option B is the quickest win with minimal code change.

### Fix 2 (Critical): Limit Concurrent Playwright Pages

In `search-orchestrator.ts`, replace `Promise.allSettled` with sequential execution:

```typescript
// Instead of Promise.allSettled(searches):
for (const search of searches) {
  await search;
}
```

This ensures only one Playwright page is active at a time, reducing peak memory from 4× pages to 1×.

### Fix 3 (High): Add Timeouts to All HTTP Calls

In `ollama.ts` and `chroma.ts`, add explicit `AbortController` timeouts:

```typescript
export async function generate(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
  
  try {
    const response = await fetch(`${config.ollama.host}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.ollama.model, prompt, stream: false }),
      signal: controller.signal,
    });
    // ...
  } finally {
    clearTimeout(timeout);
  }
}
```

Without this, failed connections to non-existent Ollama take 30-120 seconds each.

### Fix 4 (High): Graceful Degradation When Ollama Is Unavailable

The system should detect Ollama unavailability at startup and skip LLM-dependent features rather than retrying endlessly. Add a connected state:

```typescript
let ollamaAvailable = false;

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${config.ollama.host}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    ollamaAvailable = res.ok;
    return ollamaAvailable;
  } catch {
    ollamaAvailable = false;
    return false;
  }
}
```

Then check `ollamaAvailable` before making calls and skip RAG/analysis if not available.

### Fix 5 (Medium): Deploy Ollama Externally

Ollama absolutely cannot run on Render's 512 MB Free plan. Options:
1. **OpenAI API fallback**: Replace `ollama.ts` with OpenAI (as documented in DEPLOYMENT_STRATEGY.md). Costs ~$5-10/month.
2. **RunPod/Vast.ai**: Rent a GPU instance for ~$0.20-0.34/hr.
3. **Self-hosted**: Run Ollama on your local machine and expose via Cloudflare Tunnel or Tailscale.

### Fix 6 (Low): ChromaDB Connection Handling

Since ChromaDB isn't deployed either:
1. Wrap all ChromaDB calls in try/catch with fast failure (already partially done in `analyzer.ts`)
2. In `chroma.ts`, add connection timeout
3. Consider using SQLite file-based vector storage instead

---

## 6. How Features Work Without Ollama

| Feature | With Ollama | Without Ollama | Impact |
|---------|-------------|---------------|--------|
| Resume Analysis | LLM parses skills, experience | Regex fallback (basic keyword match) | Lower quality |
| Resume Tailoring | LLM rewrites for job | Fallback formatted resume | No optimization |
| RAG Matching | Semantic embedding scoring | Keyword-only matching (skill overlap) | Less accurate |
| Message Drafting | LLM generates text | Returns error | Feature broken |
| Job Search | No LLM needed | Works fine | Unaffected |
| Health Check | Shows Ollama status | Shows "unavailable" | Affects diagnostics |

The regex fallback in `analyzer.ts` is already implemented — that's good. The `tailor.ts` also has a `generateFallbackResume` function.

---

## 7. Immediate Quick Fixes (Ordered by Impact)

1. **Deploy with Ollama/Chroma disabled**: Set `OLLAMA_HOST` to an unreachable address and wrap calls with early return. This avoids timeout delays.
2. **Replace `Promise.allSettled` with sequential in orchestrator**: Peak Playwright pages drops from 4 to 1.
3. **Close browser after each search**: Add `closeBrowser()` after all searches complete.
4. **Add 5s timeout to all Ollama HTTP calls**: Prevents 30-120s connection hangs.
5. **Catch ChromaDB init errors gracefully**: Wrap `ChromaClient()` constructor in try/catch.

---

## 8. Deployment Verification Checklist

- [ ] Check Render dashboard for recent crash logs (OOM kills show as "RSS limit exceeded")
- [ ] Verify Render backend health: `https://agentic-space-backend-v2.onrender.com/api/health`
- [ ] Verify frontend is accessible: `https://frontend-lwexbdv7x-vinayak-santhoshs-projects.vercel.app`
- [ ] Test that frontend can reach backend: Check browser DevTools Network tab for API calls
- [ ] Verify Ollama is not running inside Render (expected — it shouldn't be)
- [ ] Check if the server restarts frequently (indicates repeated OOM)

---

## 9. Conclusion

The memory limit exceedance is **not primarily caused by Ollama or RAG** — those are secondary contributors. The **primary cause is the persistent Playwright Chromium browser singleton** (200-400 MB) combined with **3-4 concurrent Playwright pages during job search** (another 200-400 MB). On Render's 512 MB Free plan, this exceeds memory before any meaningful work begins.

The fix path:
1. **Immediate**: Close browser between searches + serialize page operations → drops peak from ~800 MB to ~350 MB
2. **Short-term**: Add timeouts to all external HTTP calls → prevents memory pile-up from failed connections
3. **Medium-term**: Either deploy Ollama externally or switch to OpenAI API → enables LLM features in production
4. **Long-term**: Replace Playwright scraping with lightweight HTTP+cheerio where possible → eliminates Chromium dependency entirely
