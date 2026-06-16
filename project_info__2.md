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
| **Error objects/garbage from failures** | Accumulates temporarily | GC'd when under pressure | Contributes to heap fragmentation |

**Estimated total during a job search:** 500-900 MB → **Exceeds the 512 MB limit by a wide margin.**

---

## 2. Root Cause Analysis

### Primary Cause: Playwright Singleton Browser Never Closes

**File**: `apps/backend/src/browser/playwright.ts`

```typescript
let browser: Browser | null = null;
// ... modular-level singleton, never closed
export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({ headless: ... });
  }
  return browser;
}
// closeBrowser() exists but is NEVER called anywhere
```

The browser is a **module-level singleton that never closes**. Once created, it lives for the entire server lifetime. On Render's 512 MB Free plan this is fatal:

- A headless Chromium process typically uses **200-350 MB** sitting idle
- During searches, each `newPage()` call adds 50-100 MB per active page
- `closeBrowser()` exists but is **never called** anywhere in the codebase
- Even after all search pages close, the browser stays open, reserving 200+ MB forever

### Secondary Cause: 4 Parallel Playwright Pages During Search

**File**: `apps/backend/src/services/search-orchestrator.ts`

```typescript
await Promise.allSettled(searches); // Fires 3-4 searches simultaneously
```

The orchestrator fires LinkedIn, Naukri, Indeed, and Google Jobs agents **all at once** via `Promise.allSettled`. Each agent opens its own Playwright page. With 4 active Chromium pages + the persistent browser + in-flight HTTP connections, memory spikes well past 512 MB.

### Tertiary Cause: Cascading Connection Failures to Missing Services

**Ollama** is configured as `http://localhost:11434` in render.yaml, but **no Ollama instance is deployed on Render.** This means:

1. **`ollama.generate()`** and **`ollama.embed()`** — called extensively (e.g., 100× during a 50-job RAG search)
2. **These have NO timeout** — failed localhost connections wait 30-120 seconds (OS TCP default)
3. Every call fails, but the pending promises and error objects pile up in memory

The `checkOllama()` function in `index.ts` does have a 2.5s `AbortController` timeout, but this is **only used on the diagnostics endpoint** — the actual service calls have no timeout.

### Quaternary Cause: Error Object Accumulation

Every failed Ollama call creates multiple error objects in the V8 heap:
- HTTP fetch error objects
- console.error string buffers  
- Logger file writes + Notion API attempts
- Caught exceptions in retry logic

Under memory pressure, GC becomes less effective, accelerating the crash.

---

## 3. Is the Render URL Active?

The server is **technically running** but will OOM on the first job search:

1. Server starts on port 3001, Express boots fine
2. `GET /api/health` → responds `{"status":"ok"}` without touching Ollama — **this works**
3. `POST /api/resume/upload` → tries `http://localhost:11434` → **fails after 30-120s timeout** → falls back to regex extraction
4. `POST /api/jobs/search` → **launches Chromium browser** (200+ MB) → opens 3-4 pages (200-400 MB) → then 100 Ollama calls → **memory exceeded → process killed by Render**

The cycle repeats on auto-restart.

### What to Check:
- **Backend health**: `https://agentic-space-backend-v2.onrender.com/api/health`
- **Frontend**: `https://frontend-lwexbdv7x-vinayak-santhoshs-projects.vercel.app`
- **Render dashboard**: Look for "RSS limit exceeded" or OOM crash logs
- Browser DevTools Network tab: Check if API calls from frontend reach the Render backend

---

## 4. Build & Deploy Configuration Issues

### render.yaml Issues
```yaml
plan: free
envVars:
  - key: OLLAMA_HOST
    value: http://localhost:11434  # ← No Ollama on Render! This is the critical misconfig.
  - key: PLAYWRIGHT_BROWSERS_PATH
    value: "0"
```

**Critical issue**: `OLLAMA_HOST` points to localhost but there is no Ollama on Render. The system tries connecting on every LLM-dependent operation and fails after OS timeout.

### Dockerfile Issues
```dockerfile
RUN npx playwright install chromium --with-deps
```
- Installs Chromium (~300 MB on disk) in the production image
- No `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` or download-only option

### Vercel Frontend Config
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://agentic-space-backend-v2.onrender.com/api/$1" }
  ]
}
```
- Routes all `/api/*` calls to the Render backend
- Works for HTTP routing but adds latency

---

## 5. Required Fixes (Ordered by Impact)

### Fix 1 (Critical): Close Playwright Browser Between Searches

The singleton browser pattern must be replaced. Quickest fix:

**In `playwright.ts`**: Change `getBrowser()` to create/return browser per-call rather than caching. Add an auto-close timer (e.g., 2 minutes of inactivity → close browser).

OR simpler: **Launch + close per search** — each search creates its own browser instance and closes it in a `finally` block.

### Fix 2 (Critical): Serialize Playwright Page Operations

**In `search-orchestrator.ts`**: Replace `await Promise.allSettled(searches)` with sequential execution:

```typescript
// Instead of parallel:
for (const search of searches) {
  await search;
}
```

This drops peak concurrent Playwright pages from 4 to 1, saving 200-300 MB.

### Fix 3 (High): Add Timeouts to All HTTP Calls

**In `ollama.ts`** and **`chroma.ts`**: Add `AbortController` with 5-second timeout:

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);
try {
  const response = await fetch(url, { signal: controller.signal, ... });
} finally {
  clearTimeout(timeout);
}
```

Without this, every failed connection wastes 30-120 seconds of memory and time.

### Fix 4 (High): Graceful Degradation — Detect Ollama at Startup

Add a module-level health check that runs at server start:

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

Then guard all LLM operations: `if (!ollamaAvailable) return fallbackResult`.

The codebase already has regex fallbacks in `analyzer.ts` and `tailor.ts` — these just need to be triggered when Ollama is unavailable (rather than timing out).

### Fix 5 (Medium): Deploy Ollama Externally

Ollama absolutely cannot run on Render's 512 MB Free plan. Options:

1. **OpenAI API fallback**: Replace `ollama.ts` with `openai` package + `gpt-4o-mini` + `text-embedding-3-small`. Cost ~$5-10/month for moderate use.
2. **RunPod/Vast.ai**: Rent a GPU instance for ~$0.20-0.34/hr
3. **Self-hosted**: Run Ollama locally, expose via Cloudflare Tunnel or Tailscale

### Fix 6 (Low): ChromaDB Error Handling

**In `chroma.ts`**: The `ChromaClient()` is created at import time with no try/catch. Wrap it or lazy-initialize it.

Since ChromaDB is also not deployed on Render, it should fail gracefully.

---

## 6. Impact of Missing Ollama

| Feature | Behavior Without Ollama | Fallback Quality |
|---------|------------------------|-----------------|
| Resume Analysis | Regex fallback (keyword matching) | Decent — basic skill extraction works |
| Resume Tailoring | `generateFallbackResume()` formats original | No optimization but readable |
| RAG Matching | Keyword-only (skill overlap) | Less accurate but functional |
| Message Drafting | Returns error | Broken |
| Job Search | Works fine (no LLM involvement) | Full quality |

The system is designed with fallbacks — they just need to trigger before the timeouts kill memory.

---

## 7. Immediate Actions (Quick Wins)

1. **Check Render health endpoint** to confirm the server boots: `https://agentic-space-backend-v2.onrender.com/api/health`
2. **Check frontend**: `https://frontend-lwexbdv7x-vinayak-santhoshs-projects.vercel.app` — should load the React UI
3. **In Render dashboard**: Verify if the backend is constantly restarting (OOM kill → restart cycle)
4. **In browser DevTools**: Open Network tab, navigate frontend, check if API calls reach backend
5. **In Render logs**: Look for "RSS limit exceeded" or process killed messages

To fix the immediate memory issue, the order of fixes should be:
1. Serialize Playwright searches (prevents 4 concurrent browsers)
2. Add closeBrowser() after searches (releases the 200 MB browser process)
3. Add 5s timeouts to all HTTP calls (prevents memory pile-up)
4. Detect Ollama at startup and degrade gracefully
5. Deploy Ollama externally or switch to OpenAI API

---

## 8. Conclusion

**The memory limit exceedance is not primarily caused by Ollama or RAG.** The primary cause is:

1. **Persistent Playwright Chromium browser** (200-400 MB) — acts as a memory leak
2. **4 concurrent Playwright pages during job search** (200-400 MB) — unnecessary parallelism
3. **Cascading connection failures to non-existent Ollama** (100s of timeout-bound HTTP calls)
4. **No timeouts on any external HTTP calls** — failed connections consume memory for 30-120 seconds each

With the fixes above (serialize searches, close browser between uses, add timeouts, graceful degradation), the peak memory can be reduced from ~800 MB to ~300 MB — comfortably under Render's 512 MB Free plan limit.

The backend will still **not have full LLM features** until Ollama is deployed externally or replaced with an API-based solution. But Job Search, Resume Upload, and basic matching will work without memory issues.