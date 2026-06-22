import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Only load .env in development — in production (Docker/Cloud Run), env vars are set via the runtime
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
}

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    embedModel: process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small",
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    embedModel: process.env.GEMINI_EMBED_MODEL || "text-embedding-004",
    baseUrl: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai/",
    useAdc: process.env.GEMINI_USE_ADC !== undefined
      ? process.env.GEMINI_USE_ADC === "true"
      : !process.env.GEMINI_API_KEY, // default to true if no API key is set
  },

  ollama: {
    host: process.env.OLLAMA_HOST || "http://localhost:11434",
    model: process.env.OLLAMA_MODEL || "mistral",
    embedModel: process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text",
  },

  jobApi: {
    adzunaAppId: process.env.ADZUNA_APP_ID || "",
    adzunaAppKey: process.env.ADZUNA_APP_KEY || "",
    serpApiKey: process.env.SERPAPI_KEY || "",
    rapidApiKey: process.env.RAPIDAPI_KEY || "",
  },

  chroma: {
    url: process.env.CHROMA_URL || "http://localhost:8000",
  },

  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  notion: {
    token: process.env.NOTION_TOKEN || "",
    databaseId: process.env.NOTION_DATABASE_ID || "",
  },

  browser: {
    headless: process.env.BROWSER_HEADLESS === "true",
  },

  paths: {
    // Cloud Run filesystem is read-only except /tmp; use local writable path for uploads
    logs: path.resolve(__dirname, "../../../logs"),
    uploads: process.env.NODE_ENV === "production"
      ? "/tmp/uploads"
      : path.resolve(__dirname, "../../../uploads"),
  },
};
