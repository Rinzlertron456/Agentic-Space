import express from "express";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config.js";
import { resumeRouter } from "./routes/resume.js";
import { jobsRouter } from "./routes/jobs.js";
import { tailorRouter } from "./routes/tailor.js";
import { networkRouter } from "./routes/network.js";
import { logsRouter } from "./routes/logs.js";
import { isOllamaAvailable, resetOllamaAvailability } from "./services/ollama.js";
import { isChromaAvailable } from "./services/chroma.js";

const app = express();

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const allowedOrigins = [
        config.frontendUrl,
        "http://localhost:5173",
        "http://localhost:3000",
        "https://agentic-space.vercel.app",
        "https://job-hunter-pm1k3u0cz-vinayak-santhoshs-projects.vercel.app"
      ];
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        /^http:\/\/localhost:\d+$/.test(origin);
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

async function checkOllama() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(`${config.ollama.host}/api/tags`, {
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      status: response.status,
      host: config.ollama.host,
      model: config.ollama.model,
      embedModel: config.ollama.embedModel,
    };
  } catch (error) {
    return {
      ok: false,
      host: config.ollama.host,
      model: config.ollama.model,
      embedModel: config.ollama.embedModel,
      error: error instanceof Error ? error.message : "Unknown Ollama check error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

app.get("/api/diagnostics", async (_req, res) => {
  const [ollama, chroma, llm] = await Promise.all([
    checkOllama(),
    isChromaAvailable().then((ok) => ({ ok, url: config.chroma.url })),
    isOllamaAvailable().then((ok) => ({
      ok,
      provider: (config.gemini.apiKey || config.gemini.useAdc) ? "Gemini" : "OpenAI",
      model: (config.gemini.apiKey || config.gemini.useAdc) ? config.gemini.model : config.openai.model,
      embedModel: (config.gemini.apiKey || config.gemini.useAdc) ? config.gemini.embedModel : config.openai.embedModel,
      apiKeySet: Boolean(config.gemini.apiKey || config.gemini.useAdc || config.openai.apiKey),
    })),
  ]);

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    frontendUrl: config.frontendUrl,
    chroma,
    ollama,
    openai: llm,
  });
});

// Routes
app.use("/api/resume", resumeRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/tailor", tailorRouter);
app.use("/api/network", networkRouter);
app.use("/api/logs", logsRouter);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, error: err?.message || "Internal server error" });
});

// Start server
app.listen(config.port, async () => {
  console.log(`🚀 Agentic-Space Backend running on http://localhost:${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Frontend: ${config.frontendUrl}`);

  // Check external service availability at startup
  const llmOk = await isOllamaAvailable();
  const chromaOk = await isChromaAvailable();
  
  const isGemini = Boolean(config.gemini.apiKey || config.gemini.useAdc);
  const provider = isGemini ? "Gemini" : "OpenAI";
  const model = isGemini ? config.gemini.model : config.openai.model;
  const embedModel = isGemini ? config.gemini.embedModel : config.openai.embedModel;

  console.log(`   ${provider}: ${llmOk ? "✅ ONLINE" : "❌ OFFLINE"} (model: ${model}, embed: ${embedModel})`);
  if (!llmOk) {
    console.log(`   ℹ️  Set GEMINI_API_KEY, enable Google Cloud ADC, or set OPENAI_API_KEY to enable LLM features.`);
    console.log(`   ℹ️  When Gemini/OpenAI is offline, local Ollama at ${config.ollama.host} is tried as fallback.`);
  }
  console.log(`   ChromaDB: ${chromaOk ? "✅ ONLINE" : "❌ OFFLINE"} (host: ${config.chroma.url})`);
});



export default app;
