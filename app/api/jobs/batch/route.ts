import { NextResponse } from "next/server";
import { runStore, tailorResume } from "@/lib/pythonBridge";

type BatchBody = {
  action: "approve" | "reject" | "tailor";
  ids: string[];
};

export async function POST(request: Request) {
  const body = (await request.json()) as BatchBody;
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: "ids are required" }, { status: 400 });
  }
  if (body.action === "approve") {
    return NextResponse.json(runStore("approve_jobs", { ids: body.ids, detail: "Batch approved from mobile dashboard" }));
  }
  if (body.action === "reject") {
    return NextResponse.json(runStore("reject_jobs", { ids: body.ids, detail: "Batch rejected from mobile dashboard" }));
  }
  if (body.action === "tailor") {
    return NextResponse.json({ results: body.ids.map((id) => tailorResume(id)) });
  }
  return NextResponse.json({ error: "unsupported action" }, { status: 400 });
}
