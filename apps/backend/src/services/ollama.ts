import OpenAI from "openai";
import { config } from "../config.js";

/** HTTP timeout for OpenAI API calls */
const OPENAI_TIMEOUT_MS = 15_000;

let _openai: OpenAI | null = null;
let _llmAvailable: boolean | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!config.openai.apiKey) {
      // Will be caught by caller and fallback to Ollama
      throw new Error("OPENAI_API_KEY not configured");
    }
    _openai = new OpenAI({
      apiKey: config.openai.apiKey,
      timeout: OPENAI_TIMEOUT_MS,
      maxRetries: 1,
    });
  }
  return _openai;
}

// ─── Availability detection ────────────────────────────────────

/**
 * Check whether any LLM backend is available.
 * Prioritizes OpenAI. Falls back to local Ollama if OpenAI is not configured.
 */
export async function isOllamaAvailable(): Promise<boolean> {
  if (_llmAvailable !== null) return _llmAvailable;

  // Try OpenAI first
  if (config.openai.apiKey) {
    try {
      const models = await getOpenAI().models.list();
      if (models.data.length > 0) {
        _llmAvailable = true;
        console.log(`[LLM] OpenAI ✅ ONLINE (model: ${config.openai.model})`);
        return true;
      }
    } catch {
      console.warn("[LLM] OpenAI key configured but API unreachable — will try Ollama fallback");
    }
  }

  // Try local Ollama as fallback
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${config.ollama.host}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      _llmAvailable = true;
      console.log(`[LLM] Ollama ✅ ONLINE (host: ${config.ollama.host})`);
      return true;
    }
  } catch {
    // Ollama also unavailable
  }

  _llmAvailable = false;
  console.warn("[LLM] No LLM backend available (OpenAI API key not set and Ollama unreachable)");
  return false;
}

/**
 * Reset cached availability so the next call rechecks.
 */
export function resetOllamaAvailability(): void {
  _llmAvailable = null;
}

// ─── Generate ──────────────────────────────────────────────────

export async function generate(prompt: string): Promise<string> {
  await checkOrThrow();

  // Try OpenAI first
  if (config.openai.apiKey) {
    try {
      const response = await getOpenAI().chat.completions.create({
        model: config.openai.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2048,
      });
      const content = response.choices[0]?.message?.content;
      if (content) return content;
    } catch {
      console.warn("[LLM] OpenAI generate failed, falling back to Ollama");
    }
  }

  // Fallback to local Ollama
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${config.ollama.host}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.ollama.model,
        prompt,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = (await response.json()) as { response: string };
    return data.response;
  } catch (error) {
    // Both backends failed — mark unavailable to short-circuit future calls
    _llmAvailable = false;
    console.error("[LLM] Both OpenAI and Ollama unavailable for generate");
    throw new Error("No LLM backend available (OpenAI and Ollama both unreachable)");
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Embed ─────────────────────────────────────────────────────

export async function embed(text: string): Promise<number[]> {
  await checkOrThrow();

  // Try OpenAI first
  if (config.openai.apiKey) {
    try {
      const response = await getOpenAI().embeddings.create({
        model: config.openai.embedModel,
        input: text,
      });
      return response.data[0].embedding;
    } catch {
      console.warn("[LLM] OpenAI embedding failed, falling back to Ollama");
    }
  }

  // Fallback to local Ollama
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${config.ollama.host}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.ollama.embedModel,
        prompt: text,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding API error: ${response.status}`);
    }

    const data = (await response.json()) as { embedding: number[] };
    return data.embedding;
  } catch (error) {
    _llmAvailable = false;
    console.error("[LLM] Both OpenAI and Ollama unavailable for embedding");
    throw new Error("No LLM backend available (OpenAI and Ollama both unreachable)");
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Internal helpers ──────────────────────────────────────────

async function checkOrThrow(): Promise<void> {
  if (!(await isOllamaAvailable())) {
    throw new Error(
      "No LLM backend available. Set OPENAI_API_KEY or ensure Ollama is running.",
    );
  }
}
