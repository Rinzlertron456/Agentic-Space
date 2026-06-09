import { runDiscovery } from "./discover";
import { runStore } from "../lib/pythonBridge";

const intervalMs = Number(process.env.SCHEDULER_POLL_MS ?? 60_000);
const minRunGapMs = Number(process.env.DISCOVERY_INTERVAL_MS ?? 60 * 60 * 1000);
let running = false;
let lastRunAt = 0;

function schedulerEnabled() {
  const settings = runStore<{ scheduler_enabled?: boolean }>("settings");
  return settings.scheduler_enabled === true;
}

async function tick() {
  if (running) return;
  if (!schedulerEnabled()) return;
  if (Date.now() - lastRunAt < minRunGapMs) return;
  running = true;
  try {
    const result = await runDiscovery({ tailorTop: Number(process.env.TAILOR_TOP_PER_RUN ?? 10) });
    lastRunAt = Date.now();
    console.log(`[scheduler] ${result.summary}`);
  } catch (error) {
    console.error("[scheduler]", error);
  } finally {
    running = false;
  }
}

console.log(`[scheduler] started; poll=${intervalMs}ms discoveryGap=${minRunGapMs}ms`);
void tick();
setInterval(() => void tick(), intervalMs);
