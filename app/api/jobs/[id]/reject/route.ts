import { NextResponse } from "next/server";
import { runStore } from "@/lib/pythonBridge";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = runStore("reject_jobs", { ids: [id], detail: "Rejected from mobile dashboard" });
  return NextResponse.json(result);
}
