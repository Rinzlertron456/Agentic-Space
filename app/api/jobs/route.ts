import { NextResponse } from "next/server";
import { runStore, tailorResume } from "@/lib/pythonBridge";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const jobs = runStore<Job[]>("list_jobs", status ? { status } : {});
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (body.action === "tailor" && body.id) {
    return NextResponse.json(tailorResume(body.id));
  }
  return NextResponse.json({ error: "unsupported action" }, { status: 400 });
}
