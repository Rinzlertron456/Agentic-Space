import { config } from "../config.js";

/** HTTP timeout for Ollama calls — prevents memory pile-up from hanging connections */
const OLLAMA_TIMEOUT_MS = 5_000;

interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
}

interface OllamaEmbedResponse {
  embedding: number[];
}

// ─── Availability detection ────────────────────────────────────

let _ollamaAvailable: boolean | null = null;

/**
 * Check whether Ollama is reachable at the configured host.
 * Results are cached so repeated calls don't hammer a dead host.
 */
export async function isOllamaAvailable(): Promise<boolean> {
  if (_ollamaAvailable !== null) return _ollamaAvailable;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);

  try {
    const response = await fetch(`${config.ollama.host}/api/tags`, {
      signal: controller.signal,
    });
    _ollamaAvailable = response.ok;
  } catch {
    _ollamaAvailable = false;
  } finally {
    clearTimeout(timeout);
  }

  console.log(
    `[Ollama] Availability check: ${_ollamaAvailable ? "ONLINE" : "OFFLINE"} at ${config.ollama.host}`,
  );

  return _ollamaAvailable;
}

/**
 * Reset cached availability so the next call rechecks.
 * Useful after a network change or when retrying.
 */
export function resetOllamaAvailability(): void {
  _ollamaAvailable = null;
}

// ─── Generate ──────────────────────────────────────────────────

export async function generate(prompt: string): Promise<string> {
  await checkOllamaOrThrow();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

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

    const data = (await response.json()) as OllamaGenerateResponse;
    return data.response;
  } catch (error) {
    // On timeout/network error, mark Ollama as unavailable so subsequent calls fail fast
    _ollamaAvailable = false;
    console.error("Ollama generate error:", error);
    throw new Error(
      `Ollama unavailable at ${config.ollama.host}. Ensure Ollama is running.`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Embed ─────────────────────────────────────────────────────

export async function embed(text: string): Promise<number[]> {
  await checkOllamaOrThrow();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

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

    const data = (await response.json()) as OllamaEmbedResponse;
    return data.embedding;
  } catch (error) {
    _ollamaAvailable = false;
    console.error("Ollama embedding error:", error);
    throw new Error(
      `Ollama unavailable at ${config.ollama.host}. Ensure Ollama is running.`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Internal helpers ──────────────────────────────────────────

async function checkOllamaOrThrow(): Promise<void> {
  if (!(await isOllamaAvailable())) {
    throw new Error(
      `Ollama is not available at ${config.ollama.host}. LLM-dependent features are disabled.`,
    );
  }
}
