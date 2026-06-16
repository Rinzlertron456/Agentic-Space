import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    embedModel: process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small",
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
    logs: path.resolve(__dirname, "../../../logs"),
    uploads: path.resolve(__dirname, "../../../uploads"),
  },
};
