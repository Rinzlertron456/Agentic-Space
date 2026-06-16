# Investigation — Localhost vs Render Behavior + Ollama Dependencies

## Problem 1: "90 Curated Company Career Sites" Instead of Real Job Results

I traced the code path. Here is exactly what happens:

### The Code Flow

1. **Frontend calls** `POST /api/jobs/search` → `searchJobs()` in `search-orchestrator.ts`
2. Orchestrator fires **4 search agents** in parallel:
   - `searchLinkedInSource()` → uses Playwright to scrape LinkedIn
   - `searchNaukriSource()` → uses Playwright to scrape Naukri  
   - `searchWebSource()` → uses Playwright to scrape Indeed/Google Jobs
   - `searchCompanyPortals()` → **just reads a static URL list**

3. **The critical bug**: The LinkedIn/Naukri/Web agents **all fail silently** and catch their own errors, adding **zero results** to the array. The only agent that "succeeds" is `searchCompanyPortals()` which just adds **one summary row** saying `"90 Curated Company Career Sites"` — it does NOT actually scrape those 90 career sites for real jobs.

### Why It Fails in Both Places

| Agent | Likely Failure Reason |
|-------|----------------------|
| **LinkedIn** (`linkedin.ts`) | LinkedIn blocks Playwright browsers. The `page.waitForSelector()` times out. Login wall appears. All errors are caught silently. |
| **Naukri** (`naukri.ts`) | Same issue — Naukri blocks automated browsers. CSS selectors become obsolete. |
| **Indeed** (`web-search.ts`) | Uses plain `fetch()` + Cheerio. Indeed may return captcha page or empty results. |
| **Google Jobs** (`web-search.ts`) | Requires JS rendering. Google SERP structure frequently changes. |

### The Code That Bypasses the Failure

```typescript
// search-orchestrator.ts — searchCompanyPortals()
results.push({
  id: uuidv4(),
  source: "company_portal",
  sourceId: "career-sites-index",
  title: `${urls.length} Curated Company Career Sites`,
  // ^^^ This is NOT a real job. It's a placeholder summary entry.
  description: `${urls.length} company career sites available for direct search...`,
  ...
});
```

Since every other agent returns 0 results (silent failures), this **one placeholder entry** is all the user sees. The "90" comes from `getAllKnownCareerUrls()` in `packages/shared/src/constants/company-sites.ts` which returns a static list of 90 company career page URLs.

## Problem 2: Draft Connection Message Still Depends on Ollama

Looking at `network.ts`:

```typescript
import { generate } from "./ollama.js";
```

The code imports `generate()` which now has **dual-mode** — tries OpenAI first, falls back to Ollama. On localhost:
- If `OPENAI_API_KEY` is set in `.env` → works via OpenAI
- If `OPENAI_API_KEY` is missing or invalid → falls back to `http://localhost:11434` (your local Ollama)
- If both fail → returns `{ success: false, error: "No LLM backend available" }`

The `.env` file already has the key, so this **should work on localhost**. But the Catch-22 is that **drafting a message requires an analyzed resume** — and if resume analysis fails (due to the same LLM dependency), there's no resume loaded to draft from.

## The Real Root Problem

**The LinkedIn/Naukri/Web scraping agents are fundamentally broken.** They were written to scrape JS-rendered pages but the target websites block them. This is NOT an environment-specific issue — it affects both localhost and Render equally. The "90 curated career sites" entry is a red herring that masks the real failures.

## What Needs to Change

To fix job search, you have two paths:

**Path A: Fix the scraping agents (more work, fragile)**
- LinkedIn requires a logged-in session (cookie-based)
- Naukri requires evading bot detection
- Selectors need updating

**Path B: Replace scraping with APIs (recommended)**
- Use **LinkedIn Jobs API** (via RapidAPI or similar)
- Use **Google Jobs API** (via SerpAPI or Programmable Search)
- Use **Adzuna API** (free tier, 30K queries/month)
- These return structured JSON — no Playwright needed, faster, no memory issues

For the **network/message drafting**: The code already uses OpenAI on Render (with the key). On localhost it should work the same way since the key is in `.env`. The only issue is if the key is invalid or if Ollama on localhost produces poor results.

Would you like me to document the exact code fixes needed to switch from Playwright scraping to job search APIs in Act Mode?