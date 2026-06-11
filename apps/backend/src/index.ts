import express from "express";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config.js";
import { resumeRouter } from "./routes/resume.js";
import { jobsRouter } from "./routes/jobs.js";
import { tailorRouter } from "./routes/tailor.js";
import { networkRouter } from "./routes/network.js";
import { logsRouter } from "./routes/logs.js";

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

// Routes
app.use("/api/resume", resumeRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/tailor", tailorRouter);
app.use("/api/network", networkRouter);
app.use("/api/logs", logsRouter);

// Start server
app.listen(config.port, () => {
  console.log(`🚀 Agentic-Space Backend running on http://localhost:${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Ollama: ${config.ollama.host}`);
  console.log(`   Frontend: ${config.frontendUrl}`);
});

export default app;
