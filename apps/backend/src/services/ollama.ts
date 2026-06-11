import { config } from "../config.js";

interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
}

interface OllamaEmbedResponse {
  embedding: number[];
}

export async function generate(prompt: string): Promise<string> {
  try {
    const response = await fetch(`${config.ollama.host}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.ollama.model,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = (await response.json()) as OllamaGenerateResponse;
    return data.response;
  } catch (error) {
    console.error("Ollama generate error:", error);
    throw new Error(`Ollama unavailable at ${config.ollama.host}. Ensure Ollama is running.`);
  }
}

export async function embed(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${config.ollama.host}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.ollama.embedModel,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding API error: ${response.status}`);
    }

    const data = (await response.json()) as OllamaEmbedResponse;
    return data.embedding;
  } catch (error) {
    console.error("Ollama embedding error:", error);
    throw new Error(`Ollama unavailable at ${config.ollama.host}. Ensure Ollama is running.`);
  }
}
