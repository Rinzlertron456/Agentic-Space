import { ChromaClient } from "chromadb";

const client = new ChromaClient();

export async function getOrCreateCollection(name: string = "resumes") {
  try {
    return await client.getOrCreateCollection({ name });
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
