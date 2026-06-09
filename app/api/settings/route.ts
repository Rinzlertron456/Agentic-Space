import { NextResponse } from "next/server";
import { runStore } from "@/lib/pythonBridge";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(runStore("settings"));
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json(runStore("set_settings", { settings: body.settings ?? body }));
}
