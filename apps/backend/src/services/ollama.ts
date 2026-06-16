import OpenAI from "openai";
import { config } from "../config.js";

/** HTTP timeout for OpenAI API calls */
const OPENAI_TIMEOUT_MS = 15_000;

let _openai: OpenAI | null = null;
let _ollamaAvailable: boolean | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!config.openai.apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not configured. Set it in environment variables.",
      );
    }
    _openai = new OpenAI({
      apiKey: config.openai.apiKey,
      timeout: OPENAI_TIMEOUT_MS,
      maxRetries: 2,
    });
  }
  return _openai;
}

// ─── Availability detection ────────────────────────────────────

/**
 * Check whether a working LLM backend is available.
 * For OpenAI a valid API key is enough — no ping needed.
 */
export async function isOllamaAvailable(): Promise<boolean> {
  if (_ollamaAvailable !== null) return _ollamaAvailable;

  if (!config.openai.apiKey) {
    _ollamaAvailable = false;
    console.warn(
      "[OpenAI] No API key configured — LLM-dependent features disabled.",
    );
    return false;
  }

  // Quick validation: list models
  try {
    const models = await getOpenAI().models.list();
    _ollamaAvailable = models.data.length > 0;
  } catch {
    _ollamaAvailable = false;
  }

  console.log(
    `[OpenAI] Availability check: ${_ollamaAvailable ? "✅ ONLINE" : "❌ OFFLINE"}`,
  );

  return _ollamaAvailable;
}

/**
 * Reset cached availability so the next call rechecks.
 */
export function resetOllamaAvailability(): void {
  _ollamaAvailable = null;
}

// ─── Generate ──────────────────────────────────────────────────

export async function generate(prompt: string): Promise<string> {
  await checkOrThrow();

  const response = await getOpenAI().chat.completions.create({
    model: config.openai.model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty response");
  }

  return content;
}

// ─── Embed ─────────────────────────────────────────────────────

export async function embed(text: string): Promise<number[]> {
  await checkOrThrow();

  const response = await getOpenAI().embeddings.create({
    model: config.openai.embedModel,
    input: text,
  });

  return response.data[0].embedding;
}

// ─── Internal helpers ──────────────────────────────────────────

async function checkOrThrow(): Promise<void> {
  if (!(await isOllamaAvailable())) {
    throw new Error(
      "OpenAI is not configured. Set OPENAI_API_KEY in environment variables.",
    );
  }
}
