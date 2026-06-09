#!/usr/bin/env python
"""Export activity logs to local Word/Markdown/JSON artifacts."""

from __future__ import annotations

import html
import json
import os
import sqlite3
import zipfile
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = Path(os.environ.get("JOB_AGENT_DB_PATH", ROOT / ".data" / "job_agent.sqlite"))
OUT_DIR = Path(os.environ.get("LOG_ARTIFACT_DIR", ROOT / "artifacts" / "logs"))


def fetch_logs() -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute("SELECT * FROM activities ORDER BY ts DESC LIMIT 500").fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def paragraph(text: str, bold: bool = False) -> str:
    props = "<w:rPr><w:b/></w:rPr>" if bold else ""
    return f"<w:p><w:r>{props}<w:t>{html.escape(text)}</w:t></w:r></w:p>"


def write_docx(logs: list[dict], path: Path) -> None:
    body = [
        paragraph("Mobile Job Agent Activity Log", True),
        paragraph(f"Generated {datetime.now(timezone.utc).isoformat(timespec='seconds')}")
    ]
    for item in logs:
        body.append(paragraph(f"{item['ts']} | {item['action']} | {item.get('job_id') or ''}", True))
        body.append(paragraph(item.get("detail") or ""))
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
        + "\n".join(body)
        + "</w:body></w:document>"
    )
    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        "</Types>"
    )
    rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        "</Relationships>"
    )
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("word/document.xml", document_xml)


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    logs = fetch_logs() if DB_PATH.exists() else []
    write_docx(logs, OUT_DIR / "activity-report.docx")
    (OUT_DIR / "google-doc-sync.md").write_text(
        "# Mobile Job Agent Activity Log\n\n"
        + "\n".join(f"- {item['ts']} | {item['action']} | {item.get('job_id') or ''} | {item.get('detail') or ''}" for item in logs),
        encoding="utf-8",
    )
    (OUT_DIR / "notion-sync.json").write_text(json.dumps({"logs": logs}, indent=2), encoding="utf-8")
    print(json.dumps({"logs": len(logs), "out_dir": str(OUT_DIR)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
