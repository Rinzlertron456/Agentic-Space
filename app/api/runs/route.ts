import { NextResponse } from "next/server";
import { runDiscovery } from "@/runner/discover";
import { runStore } from "@/lib/pythonBridge";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(runStore("stats"));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (body.action === "discover") {
    const result = await runDiscovery({ tailorTop: Number(body.tailorTop ?? 10) });
    return NextResponse.json({ summary: result.summary });
  }
  if (body.action === "scheduler") {
    const settings = runStore("set_settings", {
      settings: { scheduler_enabled: Boolean(body.enabled) }
    });
    return NextResponse.json(settings);
  }
  return NextResponse.json({ error: "unsupported action" }, { status: 400 });
}
