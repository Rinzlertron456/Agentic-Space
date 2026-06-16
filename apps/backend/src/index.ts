import express from "express";
import cors from "cors";
import morgan from "morgan";
import { access } from "fs/promises";
import { chromium } from "playwright";
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
    origin: config.frontendUrl,
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

async function checkPlaywright() {
  const executablePath = chromium.executablePath();

  try {
    await access(executablePath);
    return {
      ok: true,
      executablePath,
      browsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH || "default",
      headless: config.browser.headless,
    };
  } catch (error) {
    return {
      ok: false,
      executablePath,
      browsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH || "default",
      headless: config.browser.headless,
      error: error instanceof Error ? error.message : "Unknown Playwright check error",
    };
  }
}

app.get("/api/diagnostics", async (_req, res) => {
  const [ollama, playwright, chroma, openai] = await Promise.all([
    checkOllama(),
    checkPlaywright(),
    isChromaAvailable().then((ok) => ({ ok, url: config.chroma.url })),
    isOllamaAvailable().then((ok) => ({
      ok,
      model: config.openai.model,
      embedModel: config.openai.embedModel,
      apiKeySet: Boolean(config.openai.apiKey),
    })),
  ]);

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    frontendUrl: config.frontendUrl,
    chroma,
    ollama,
    openai,
    playwright,
  });
});

// Routes
app.use("/api/resume", resumeRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/tailor", tailorRouter);
app.use("/api/network", networkRouter);
app.use("/api/logs", logsRouter);

// Start server
app.listen(config.port, async () => {
  console.log(`🚀 Agentic-Space Backend running on http://localhost:${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Frontend: ${config.frontendUrl}`);

  // Check external service availability at startup
  const openaiOk = await isOllamaAvailable();
  const chromaOk = await isChromaAvailable();
  console.log(`   OpenAI: ${openaiOk ? "✅ ONLINE" : "❌ OFFLINE"} (model: ${config.openai.model}, embed: ${config.openai.embedModel})`);
  if (!openaiOk) {
    console.log(`   ℹ️  Set OPENAI_API_KEY environment variable to enable LLM features.`);
    console.log(`   ℹ️  When OpenAI is offline, local Ollama at ${config.ollama.host} is tried as fallback.`);
  }
  console.log(`   ChromaDB: ${chromaOk ? "✅ ONLINE" : "❌ OFFLINE"} (host: ${config.chroma.url})`);
});

export default app;
