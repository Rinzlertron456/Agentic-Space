#!/usr/bin/env python
"""SQLite-backed state store for the job hunting toolkit.

The TypeScript app calls this script as a small JSON CLI. Keeping SQLite access
in Python avoids native Node SQLite dependencies while still giving us a real
database and WAL persistence.
"""

from __future__ import annotations

import json
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = Path(os.environ.get("JOB_AGENT_DB_PATH", ROOT / ".data" / "job_agent.sqlite"))


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  role_family TEXT NOT NULL,
  url TEXT NOT NULL,
  company_url TEXT,
  job_id TEXT,
  posted_at TEXT,
  discovered_at TEXT NOT NULL,
  fit_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued',
  description TEXT NOT NULL DEFAULT '',
  requirements TEXT NOT NULL DEFAULT '',
  screening_answers TEXT NOT NULL DEFAULT '[]',
  outreach_drafts TEXT NOT NULL DEFAULT '[]',
  resume_variant TEXT NOT NULL DEFAULT 'fullstack-react-node',
  tailored_resume_docx TEXT,
  tailored_resume_html TEXT,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  summary TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  job_id TEXT,
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_score ON jobs(status, fit_score DESC);
CREATE INDEX IF NOT EXISTS idx_activities_ts ON activities(ts DESC);
"""


DEFAULT_SETTINGS: dict[str, Any] = {
    "scheduler_enabled": False,
    "schedule_cron_label": "hourly",
    "safe_mode": True,
    "target_locations": ["Hyderabad", "Bengaluru", "Pune"],
    "target_roles": [
        "Full Stack Developer",
        "React Frontend Engineer",
        "Node.js Developer",
        "MERN Stack Developer",
        "UI Dashboard Engineer",
        "AI-enabled Full Stack Developer",
    ],
    "ctc_current": "7 LPA",
    "ctc_expected": "16 LPA negotiable",
    "notice_period": "Immediately available",
    "serving_notice": "N/A",
    "approval_mode": "per_job_with_batch_option",
}


def log(conn: sqlite3.Connection, action: str, detail: str = "", job_id: str | None = None) -> None:
    conn.execute(
        "INSERT INTO activities(ts, job_id, action, detail) VALUES (?, ?, ?, ?)",
        (utc_now(), job_id, action, detail),
    )


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    for key, value in DEFAULT_SETTINGS.items():
        conn.execute(
            "INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)",
            (key, json.dumps(value)),
        )
    conn.commit()


def rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(row) for row in rows]


def decode_json_fields(job: dict[str, Any]) -> dict[str, Any]:
    for field in ("screening_answers", "outreach_drafts"):
        value = job.get(field)
        if isinstance(value, str):
            try:
                job[field] = json.loads(value)
            except json.JSONDecodeError:
                job[field] = []
    return job


def upsert_jobs(conn: sqlite3.Connection, jobs: list[dict[str, Any]]) -> dict[str, Any]:
    inserted = 0
    updated = 0
    for job in jobs:
        existing = conn.execute("SELECT id FROM jobs WHERE id = ?", (job["id"],)).fetchone()
        conn.execute(
            """
            INSERT INTO jobs(
              id, source, title, company, location, role_family, url, company_url, job_id,
              posted_at, discovered_at, fit_score, status, description, requirements,
              screening_answers, outreach_drafts, resume_variant, tailored_resume_docx,
              tailored_resume_html, notes
            )
            VALUES(
              :id, :source, :title, :company, :location, :role_family, :url, :company_url, :job_id,
              :posted_at, :discovered_at, :fit_score, COALESCE(:status, 'queued'), :description,
              :requirements, :screening_answers, :outreach_drafts, :resume_variant,
              :tailored_resume_docx, :tailored_resume_html, :notes
            )
            ON CONFLICT(id) DO UPDATE SET
              source=excluded.source,
              title=excluded.title,
              company=excluded.company,
              location=excluded.location,
              role_family=excluded.role_family,
              url=excluded.url,
              company_url=excluded.company_url,
              job_id=excluded.job_id,
              posted_at=excluded.posted_at,
              fit_score=excluded.fit_score,
              description=excluded.description,
              requirements=excluded.requirements,
              screening_answers=excluded.screening_answers,
              outreach_drafts=excluded.outreach_drafts,
              resume_variant=excluded.resume_variant,
              tailored_resume_docx=COALESCE(excluded.tailored_resume_docx, jobs.tailored_resume_docx),
              tailored_resume_html=COALESCE(excluded.tailored_resume_html, jobs.tailored_resume_html),
              notes=excluded.notes
            """,
            {
                "id": job["id"],
                "source": job["source"],
                "title": job["title"],
                "company": job["company"],
                "location": job["location"],
                "role_family": job["role_family"],
                "url": job["url"],
                "company_url": job.get("company_url"),
                "job_id": job.get("job_id"),
                "posted_at": job.get("posted_at"),
                "discovered_at": job.get("discovered_at", utc_now()),
                "fit_score": int(job.get("fit_score", 0)),
                "status": job.get("status", "queued"),
                "description": job.get("description", ""),
                "requirements": job.get("requirements", ""),
                "screening_answers": json.dumps(job.get("screening_answers", [])),
                "outreach_drafts": json.dumps(job.get("outreach_drafts", [])),
                "resume_variant": job.get("resume_variant", "fullstack-react-node"),
                "tailored_resume_docx": job.get("tailored_resume_docx"),
                "tailored_resume_html": job.get("tailored_resume_html"),
                "notes": job.get("notes", ""),
            },
        )
        inserted += 0 if existing else 1
        updated += 1 if existing else 0
        log(conn, "job_upserted", f"{job['title']} at {job['company']}", job["id"])
    conn.commit()
    return {"inserted": inserted, "updated": updated, "total": len(jobs)}


def list_jobs(conn: sqlite3.Connection, status: str | None = None) -> list[dict[str, Any]]:
    if status:
        rows = conn.execute(
            "SELECT * FROM jobs WHERE status = ? ORDER BY fit_score DESC, discovered_at DESC",
            (status,),
        ).fetchall()
    else:
        rows = conn.execute(
            """
            SELECT * FROM jobs
            ORDER BY
              CASE status
                WHEN 'queued' THEN 0
                WHEN 'drafted' THEN 1
                WHEN 'approved' THEN 2
                WHEN 'applied' THEN 3
                WHEN 'rejected' THEN 4
                ELSE 5
              END,
              fit_score DESC,
              discovered_at DESC
            """
        ).fetchall()
    return [decode_json_fields(dict(row)) for row in rows]


def get_job(conn: sqlite3.Connection, job_id: str) -> dict[str, Any] | None:
    row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    return decode_json_fields(dict(row)) if row else None


def update_status(conn: sqlite3.Connection, job_ids: list[str], status: str, detail: str) -> dict[str, Any]:
    for job_id in job_ids:
        conn.execute("UPDATE jobs SET status = ? WHERE id = ?", (status, job_id))
        log(conn, status, detail, job_id)
    conn.commit()
    return {"updated": len(job_ids), "status": status}


def update_job_artifacts(conn: sqlite3.Connection, job_id: str, docx: str, html: str) -> dict[str, Any]:
    conn.execute(
        "UPDATE jobs SET tailored_resume_docx = ?, tailored_resume_html = ?, status = CASE WHEN status = 'queued' THEN 'drafted' ELSE status END WHERE id = ?",
        (docx, html, job_id),
    )
    log(conn, "resume_tailored", f"DOCX: {docx}", job_id)
    conn.commit()
    return {"job_id": job_id, "tailored_resume_docx": docx, "tailored_resume_html": html}


def list_logs(conn: sqlite3.Connection, limit: int = 100) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT * FROM activities ORDER BY ts DESC LIMIT ?",
        (limit,),
    ).fetchall()
    return rows_to_dicts(rows)


def get_settings(conn: sqlite3.Connection) -> dict[str, Any]:
    rows = conn.execute("SELECT key, value FROM settings ORDER BY key").fetchall()
    settings: dict[str, Any] = {}
    for row in rows:
        try:
            settings[row["key"]] = json.loads(row["value"])
        except json.JSONDecodeError:
            settings[row["key"]] = row["value"]
    return settings


def set_settings(conn: sqlite3.Connection, settings: dict[str, Any]) -> dict[str, Any]:
    for key, value in settings.items():
        conn.execute(
            "INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, json.dumps(value)),
        )
    log(conn, "settings_updated", ", ".join(settings.keys()))
    conn.commit()
    return get_settings(conn)


def create_run(conn: sqlite3.Connection, kind: str) -> dict[str, Any]:
    run_id = f"run_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    conn.execute(
        "INSERT INTO runs(id, kind, status, started_at) VALUES (?, ?, 'running', ?)",
        (run_id, kind, utc_now()),
    )
    log(conn, "run_started", kind)
    conn.commit()
    return {"id": run_id, "kind": kind, "status": "running"}


def finish_run(conn: sqlite3.Connection, run_id: str, status: str, summary: str) -> dict[str, Any]:
    conn.execute(
        "UPDATE runs SET status = ?, finished_at = ?, summary = ? WHERE id = ?",
        (status, utc_now(), summary, run_id),
    )
    log(conn, "run_finished", summary)
    conn.commit()
    return {"id": run_id, "status": status, "summary": summary}


def stats(conn: sqlite3.Connection) -> dict[str, Any]:
    counts = {
        row["status"]: row["count"]
        for row in conn.execute("SELECT status, COUNT(*) AS count FROM jobs GROUP BY status").fetchall()
    }
    run = conn.execute("SELECT * FROM runs ORDER BY started_at DESC LIMIT 1").fetchone()
    return {
        "counts": counts,
        "last_run": dict(run) if run else None,
        "settings": get_settings(conn),
        "db_path": str(DB_PATH),
    }


def read_payload() -> dict[str, Any]:
    if sys.stdin.isatty():
        return {}
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    return json.loads(raw)


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "missing command"}), file=sys.stderr)
        return 2
    command = sys.argv[1]
    payload = read_payload()
    with connect() as conn:
        init_db(conn)
        if command == "init":
            result: Any = {"ok": True, "db_path": str(DB_PATH)}
        elif command == "upsert_jobs":
            result = upsert_jobs(conn, payload.get("jobs", []))
        elif command == "list_jobs":
            result = list_jobs(conn, payload.get("status"))
        elif command == "get_job":
            result = get_job(conn, payload["id"])
        elif command == "approve_jobs":
            result = update_status(conn, payload["ids"], "approved", payload.get("detail", "Approved from dashboard"))
        elif command == "reject_jobs":
            result = update_status(conn, payload["ids"], "rejected", payload.get("detail", "Rejected from dashboard"))
        elif command == "mark_applied":
            result = update_status(conn, payload["ids"], "applied", payload.get("detail", "Application submitted"))
        elif command == "update_artifacts":
            result = update_job_artifacts(conn, payload["id"], payload["docx"], payload["html"])
        elif command == "logs":
            result = list_logs(conn, int(payload.get("limit", 100)))
        elif command == "settings":
            result = get_settings(conn)
        elif command == "set_settings":
            result = set_settings(conn, payload.get("settings", {}))
        elif command == "create_run":
            result = create_run(conn, payload.get("kind", "discovery"))
        elif command == "finish_run":
            result = finish_run(conn, payload["id"], payload.get("status", "completed"), payload.get("summary", ""))
        elif command == "stats":
            result = stats(conn)
        else:
            raise SystemExit(f"unknown command: {command}")
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
