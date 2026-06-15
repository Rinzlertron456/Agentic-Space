import { config } from "../config.js";
import type { LogEntry } from "@agentic-space/shared";

const NOTION_API = "https://api.notion.com/v1";

interface NotionPageProperties {
  [key: string]: {
    type: string;
    title?: { text: { content: string } }[];
    rich_text?: { text: { content: string } }[];
    date?: { start: string };
    select?: { name: string };
    url?: { url: string };
  };
}

function buildProperties(entry: LogEntry): NotionPageProperties {
  return {
    Title: {
      type: "title",
      title: [{ text: { content: entry.message.slice(0, 100) } }],
    },
    Action: {
      type: "select",
      select: { name: entry.action },
    },
    Timestamp: {
      type: "date",
      date: { start: entry.timestamp },
    },
    ...(entry.jobId
      ? {
          JobID: {
            type: "rich_text",
            rich_text: [{ text: { content: entry.jobId } }],
          },
        }
      : {}),
    ...(entry.resumeId
      ? {
          ResumeID: {
            type: "rich_text",
            rich_text: [{ text: { content: entry.resumeId } }],
          },
        }
      : {}),
    ...(entry.details
      ? {
          Details: {
            type: "rich_text",
            rich_text: [
              {
                text: { content: JSON.stringify(entry.details).slice(0, 2000) },
              },
            ],
          },
        }
      : {}),
  };
}

export async function syncToNotion(entry: LogEntry): Promise<boolean> {
  const validDatabaseId =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (
    !config.notion.token ||
    !config.notion.databaseId ||
    !validDatabaseId.test(config.notion.databaseId)
  ) {
    console.warn("[Notion] Invalid Notion configuration. Skipping sync.", {
      tokenSet: Boolean(config.notion.token),
      databaseId: config.notion.databaseId,
    });
    return false;
  }

  try {
    const response = await fetch(`${NOTION_API}/pages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.notion.token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: config.notion.databaseId },
        properties: buildProperties(entry),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn(`[Notion] API error ${response.status}: ${errorBody}`);
      return false;
    }

    console.log(
      `[Notion] Synced entry ${entry.id} to database ${config.notion.databaseId}`,
    );
    return true;
  } catch (error) {
    console.error("[Notion] Sync failed:", error);
    return false;
  }
}
