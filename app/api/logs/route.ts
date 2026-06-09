import { NextResponse } from "next/server";
import { runStore } from "@/lib/pythonBridge";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 100);
  return NextResponse.json({ logs: runStore("logs", { limit }) });
}
