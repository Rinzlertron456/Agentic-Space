import { config } from "../config.js";
import { LogEntry } from "@agentic-space/shared";

export async function syncToNotion(entry: LogEntry): Promise<boolean> {
  if (!config.notion.token || !config.notion.databaseId) {
    return false;
  }

  try {
    // TODO: Implement Notion API sync
    console.log("[Notion] Sync not yet implemented for entry:", entry.id);
    return false;
  } catch (error) {
    console.error("[Notion] Sync failed:", error);
    return false;
  }
}
