import { ChromaClient } from "chromadb";
import { config } from "../config.js";

const CHROMA_TIMEOUT_MS = 3_000;

let client: ChromaClient | null = null;
let _chromaAvailable: boolean | null = null;

function getClient(): ChromaClient {
  if (!client) {
    client = new ChromaClient({ path: config.chroma.url });
  }
  return client;
}

export async function isChromaAvailable(): Promise<boolean> {
  if (_chromaAvailable !== null) return _chromaAvailable;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHROMA_TIMEOUT_MS);

  try {
    const res = await fetch(`${config.chroma.url}/api/v1/heartbeat`, {
      signal: controller.signal,
    });
    _chromaAvailable = res.ok;
  } catch {
    _chromaAvailable = false;
    console.warn(`[ChromaDB] Not available at ${config.chroma.url} — vector features disabled`);
  } finally {
    clearTimeout(timeout);
  }

  return _chromaAvailable;
}

export async function getOrCreateCollection(name: string = "resumes") {
  if (!(await isChromaAvailable())) {
    throw new Error("ChromaDB is not available");
  }
  try {
    return await getClient().getOrCreateCollection({ name });
  } catch (error) {
    console.error("ChromaDB error:", error);
    throw error;
  }
}

export async function storeResumeEmbedding(
  resumeId: string,
  text: string,
  embedding: number[]
) {
  const collection = await getOrCreateCollection();
  await collection.add({
    ids: [resumeId],
    embeddings: [embedding],
    metadatas: [{ text, type: "resume" }],
  });
}

export async function queryJobs(jobQueryEmbedding: number[], topK: number = 10) {
  const collection = await getOrCreateCollection();
  const results = await collection.query({
    queryEmbeddings: [jobQueryEmbedding],
    nResults: topK,
  });
  return results;
}
