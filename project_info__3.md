## Investigation Complete — Summary of Findings

The full report is saved in both `project_info__1.md` and `project_info__2.md`. Here's a concise summary:

### Root Cause
**Render's `agentic-space-backend-v2` exceeds its 512 MB memory limit due to 3 compounding issues:**

1. **Playwright Chromium singleton never closes** (200-400 MB) — the browser process lives forever after the first search. `closeBrowser()` exists but is never called.

2. **4 concurrent Playwright pages** (200-400 MB) — LinkedIn + Naukri + Indeed + Google Jobs all fire in parallel via `Promise.allSettled`.

3. **Cascading connection failures to non-existent Ollama** — `OLLAMA_HOST=http://localhost:11434` but no Ollama on Render. Every LLM call (100+ during a RAG search) has **no timeout** and hangs for 30-120 seconds, with errors piling up in memory.

**Peak memory during job search: 500-900 MB → OOM on 512 MB plan**

### Deployments Status
- **Health endpoint works** (`GET /api/health` returns `{"status":"ok"}`) — no Ollama dependency
- **First job search kills the process** — launches Chromium → opens 4 pages → 100 failed Ollama calls → OOM
- **Frontend on Vercel** likely loads but API calls fail when backend is restarting from OOM

### What the codebase needs to fix
The code already has fallbacks for missing services (`regex fallback` in `analyzer.ts`, `generateFallbackResume` in `tailor.ts`) — they just never get triggered because the timeouts don't fire before the memory is exhausted.

**Switch to Act Mode** to implement these 4 fixes (in priority order):
1. Close browser after each search (releases 200-400 MB)
2. Serialize searches instead of parallel (drops 4× pages to 1×)  
3. Add 5s timeouts to all HTTP calls (prevents memory pile-up)
4. Graceful Ollama degradation (detect offline at startup, skip LLM features)