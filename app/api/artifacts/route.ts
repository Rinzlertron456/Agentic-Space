import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const root = process.cwd();
const allowedRoots = [
  path.resolve(root, "artifacts", "resumes"),
  path.resolve(root, "artifacts", "messages"),
  path.resolve(root, "artifacts", "logs")
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get("path");
  if (!requested) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  const resolved = path.resolve(requested);
  const allowed = allowedRoots.some((allowedRoot) => resolved === allowedRoot || resolved.startsWith(`${allowedRoot}${path.sep}`));
  if (!allowed) {
    return NextResponse.json({ error: "artifact path is outside allowed directories" }, { status: 403 });
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return NextResponse.json({ error: "artifact not found" }, { status: 404 });
  }

  const extension = path.extname(resolved).toLowerCase();
  const contentType =
    extension === ".html"
      ? "text/html; charset=utf-8"
      : extension === ".docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/octet-stream";
  return new NextResponse(fs.readFileSync(resolved), {
    headers: {
      "content-type": contentType,
      "content-disposition": extension === ".docx" ? `attachment; filename="${path.basename(resolved)}"` : "inline"
    }
  });
}
