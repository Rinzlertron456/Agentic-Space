import OpenAI from "openai";
import { GoogleAuth } from "google-auth-library";
import { config } from "../config.js";

/** HTTP timeout for OpenAI API calls */
const OPENAI_TIMEOUT_MS = 60_000;

let _openai: OpenAI | null = null;
let _llmAvailable: boolean | null = null;
let _currentClientType: "openai" | "gemini" | "gemini-adc" | null = null;

let _googleAuth: GoogleAuth | null = null;
let _tokenExpiry: number = 0;
let _lastToken: string = "";

async function getGoogleAccessToken(): Promise<string> {
  const now = Date.now();
  if (_lastToken && _tokenExpiry > now + 300_000) {
    return _lastToken;
  }

  if (!_googleAuth) {
    _googleAuth = new GoogleAuth({
      scopes: "https://www.googleapis.com/auth/cloud-platform",
    });
  }

  const client = await _googleAuth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token;
  if (!token) {
    throw new Error("Failed to retrieve Google Cloud access token");
  }

  _lastToken = token;
  const res = tokenResponse as any;
  _tokenExpiry = res.expiry_date || (Date.now() + 3600_000);
  
  return token;
}

async function getOpenAI(): Promise<OpenAI> {
  const isGemini = Boolean(config.gemini.apiKey || config.gemini.useAdc);
  const clientType = isGemini 
    ? (config.gemini.useAdc ? "gemini-adc" : "gemini")
    : "openai";

  if (clientType === "gemini-adc") {
    const token = await getGoogleAccessToken();
    if (!_openai || _currentClientType !== "gemini-adc" || _openai.apiKey !== token) {
      _openai = new OpenAI({
        apiKey: token,
        baseURL: config.gemini.baseUrl,
        timeout: OPENAI_TIMEOUT_MS,
        maxRetries: 1,
      });
      _currentClientType = "gemini-adc";
    }
    return _openai;
  }

  if (!_openai || _currentClientType !== clientType) {
    const apiKey = isGemini ? config.gemini.apiKey : config.openai.apiKey;
    if (!apiKey) {
      throw new Error("No OpenAI/Gemini API key configured and ADC is disabled");
    }
    _openai = new OpenAI({
      apiKey: apiKey,
      baseURL: isGemini ? config.gemini.baseUrl : undefined,
      timeout: OPENAI_TIMEOUT_MS,
      maxRetries: 1,
    });
    _currentClientType = clientType;
  }
  return _openai;
}

// ─── Availability detection ────────────────────────────────────

/**
 * Check whether any LLM backend is available.
 * Prioritizes Gemini/OpenAI. Falls back to local Ollama if not configured.
 */
export async function isOllamaAvailable(): Promise<boolean> {
  if (_llmAvailable !== null) return _llmAvailable;

  // Try Gemini or OpenAI first
  if (config.gemini.apiKey || config.gemini.useAdc || config.openai.apiKey) {
    try {
      const openaiClient = await getOpenAI();
      const models = await openaiClient.models.list();
      if (models.data.length > 0) {
        _llmAvailable = true;
        const providerName = (config.gemini.apiKey || config.gemini.useAdc) ? "Gemini" : "OpenAI";
        const modelName = (config.gemini.apiKey || config.gemini.useAdc) ? config.gemini.model : config.openai.model;
        console.log(`[LLM] ${providerName} ✅ ONLINE (model: ${modelName})`);
        return true;
      }
    } catch (err: any) {
      const providerName = (config.gemini.apiKey || config.gemini.useAdc) ? "Gemini" : "OpenAI";
      console.warn(`[LLM] ${providerName} configured but API unreachable — will try Ollama fallback. Error: ${err?.message}`);
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
  console.warn("[LLM] No LLM backend available (Gemini/OpenAI API key not set, ADC unavailable, and Ollama unreachable)");
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

  // Try Gemini/OpenAI first
  if (config.gemini.apiKey || config.gemini.useAdc || config.openai.apiKey) {
    try {
      const model = (config.gemini.apiKey || config.gemini.useAdc) ? config.gemini.model : config.openai.model;
      const openaiClient = await getOpenAI();
      const response = await openaiClient.chat.completions.create({
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2048,
      });
      const content = response.choices[0]?.message?.content;
      if (content) return content;
    } catch (err: any) {
      const providerName = (config.gemini.apiKey || config.gemini.useAdc) ? "Gemini" : "OpenAI";
      console.warn(`[LLM] ${providerName} generate failed, falling back to Ollama. Error: ${err?.message}`);
    }
  }

  // Fallback to local Ollama
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

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
    console.error("[LLM] Both Gemini/OpenAI and Ollama unavailable for generate");
    throw new Error("No LLM backend available (Gemini/OpenAI and Ollama both unreachable)");
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Embed ─────────────────────────────────────────────────────

export async function embed(text: string): Promise<number[]> {
  await checkOrThrow();

  // Try Gemini/OpenAI first
  if (config.gemini.apiKey || config.gemini.useAdc || config.openai.apiKey) {
    try {
      const model = (config.gemini.apiKey || config.gemini.useAdc) ? config.gemini.embedModel : config.openai.embedModel;
      const openaiClient = await getOpenAI();
      const response = await openaiClient.embeddings.create({
        model: model,
        input: text,
      });
      return response.data[0].embedding;
    } catch (err: any) {
      const providerName = (config.gemini.apiKey || config.gemini.useAdc) ? "Gemini" : "OpenAI";
      console.warn(`[LLM] ${providerName} embedding failed, falling back to Ollama. Error: ${err?.message}`);
    }
  }

  // Fallback to local Ollama
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

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
    console.error("[LLM] Both Gemini/OpenAI and Ollama unavailable for embedding");
    throw new Error("No LLM backend available (Gemini/OpenAI and Ollama both unreachable)");
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Internal helpers ──────────────────────────────────────────

async function checkOrThrow(): Promise<void> {
  if (!(await isOllamaAvailable())) {
    throw new Error(
      "No LLM backend available. Set GEMINI_API_KEY, OPENAI_API_KEY, or ensure Ollama is running.",
    );
  }
}


