import { NextResponse } from "next/server";
import { runStore } from "@/lib/pythonBridge";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = runStore("approve_jobs", { ids: [id], detail: "Approved from mobile dashboard" });
  return NextResponse.json(result);
}
