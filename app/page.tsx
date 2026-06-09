"use client";

import { useEffect, useMemo, useState } from "react";
import type { ActivityLog, Job } from "@/lib/types";

type Stats = {
  counts: Record<string, number>;
  last_run?: { status?: string; summary?: string; started_at?: string } | null;
  settings?: { scheduler_enabled?: boolean; safe_mode?: boolean };
  db_path?: string;
};

type Tab = "queue" | "approved" | "rejected" | "logs";

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<Stats>({ counts: {} });
  const [tab, setTab] = useState<Tab>("queue");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("Ready");

  async function load() {
    const [jobsRes, logsRes, statsRes] = await Promise.all([fetch("/api/jobs"), fetch("/api/logs?limit=80"), fetch("/api/runs")]);
    const jobsJson = await jobsRes.json();
    const logsJson = await logsRes.json();
    const statsJson = await statsRes.json();
    setJobs(jobsJson.jobs ?? []);
    setLogs(logsJson.logs ?? []);
    setStats(statsJson);
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
    const timer = window.setInterval(() => load().catch(() => undefined), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleJobs = useMemo(() => {
    if (tab === "queue") return jobs.filter((job) => ["queued", "drafted"].includes(job.status));
    if (tab === "approved") return jobs.filter((job) => ["approved", "applied"].includes(job.status));
    if (tab === "rejected") return jobs.filter((job) => job.status === "rejected");
    return [];
  }, [jobs, tab]);

  async function post(url: string, body?: unknown) {
    setBusy(url);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : "{}"
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Request failed");
      setMessage(result.summary ?? result.status ?? "Updated");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function batch(action: "approve" | "reject" | "tailor") {
    if (selected.size === 0) {
      setMessage("Select at least one job first");
      return;
    }
    await post("/api/jobs/batch", { action, ids: Array.from(selected) });
    setSelected(new Set());
  }

  async function runDiscovery() {
    await post("/api/runs", { action: "discover", tailorTop: 10 });
  }

  async function toggleScheduler() {
    await post("/api/runs", { action: "scheduler", enabled: !stats.settings?.scheduler_enabled });
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">Approval-gated job search</p>
          <h1>Mobile Job Agent</h1>
        </div>
        <div className="status-pill">{stats.settings?.safe_mode === false ? "Live mode" : "Safe mode"}</div>
      </header>

      <section className="command-strip" aria-label="Agent controls">
        <button onClick={runDiscovery} disabled={busy !== null}>
          Run search
        </button>
        <button onClick={toggleScheduler} disabled={busy !== null}>
          {stats.settings?.scheduler_enabled ? "Stop schedule" : "Start schedule"}
        </button>
        <button onClick={() => load()} disabled={busy !== null}>
          Refresh
        </button>
      </section>

      <section className="metric-row" aria-label="Pipeline metrics">
        <Metric label="Queued" value={(stats.counts?.queued ?? 0) + (stats.counts?.drafted ?? 0)} />
        <Metric label="Approved" value={stats.counts?.approved ?? 0} />
        <Metric label="Applied" value={stats.counts?.applied ?? 0} />
        <Metric label="Rejected" value={stats.counts?.rejected ?? 0} />
      </section>

      <section className="notice">
        <strong>{message}</strong>
        <span>{stats.last_run?.summary ?? "No discovery run has completed yet."}</span>
      </section>

      <nav className="tabs" aria-label="Dashboard sections">
        <button className={tab === "queue" ? "active" : ""} onClick={() => setTab("queue")}>
          Queue
        </button>
        <button className={tab === "approved" ? "active" : ""} onClick={() => setTab("approved")}>
          Approved
        </button>
        <button className={tab === "rejected" ? "active" : ""} onClick={() => setTab("rejected")}>
          Rejected
        </button>
        <button className={tab === "logs" ? "active" : ""} onClick={() => setTab("logs")}>
          Logs
        </button>
      </nav>

      {tab !== "logs" ? (
        <>
          <section className="batch-bar" aria-label="Batch review controls">
            <span>{selected.size} selected</span>
            <button onClick={() => batch("tailor")} disabled={busy !== null || selected.size === 0}>
              Tailor
            </button>
            <button onClick={() => batch("approve")} disabled={busy !== null || selected.size === 0}>
              Approve
            </button>
            <button className="danger" onClick={() => batch("reject")} disabled={busy !== null || selected.size === 0}>
              Reject
            </button>
          </section>
          <section className="job-list" aria-label="Jobs">
            {visibleJobs.length === 0 ? (
              <div className="empty">No jobs in this view. Run search to populate the review queue.</div>
            ) : (
              visibleJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  selected={selected.has(job.id)}
                  onToggle={() => toggle(job.id)}
                  onTailor={() => post("/api/jobs", { action: "tailor", id: job.id })}
                  onApprove={() => post(`/api/jobs/${job.id}/approve`)}
                  onReject={() => post(`/api/jobs/${job.id}/reject`)}
                  busy={busy !== null}
                />
              ))
            )}
          </section>
        </>
      ) : (
        <section className="log-list" aria-label="Activity logs">
          {logs.map((log) => (
            <article className="log-line" key={log.id}>
              <span>{new Date(log.ts).toLocaleString()}</span>
              <strong>{log.action}</strong>
              <p>{log.detail}</p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function JobCard({
  job,
  selected,
  onToggle,
  onTailor,
  onApprove,
  onReject,
  busy
}: {
  job: Job;
  selected: boolean;
  onToggle: () => void;
  onTailor: () => void;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  return (
    <article className="job-card">
      <div className="card-top">
        <label className="select-row">
          <input type="checkbox" checked={selected} onChange={onToggle} />
          <span>{job.source}</span>
        </label>
        <span className={`score ${job.fit_score >= 80 ? "high" : job.fit_score >= 65 ? "mid" : "low"}`}>{job.fit_score}</span>
      </div>

      <h2>{job.title}</h2>
      <p className="company">
        {job.company} · {job.location} · {job.role_family}
      </p>

      <div className="meta-grid">
        <span>Status: {job.status}</span>
        <span>Job ID: {job.job_id ?? "Not found"}</span>
        <span>Variant: {job.resume_variant}</span>
      </div>

      <p className="description">{job.description}</p>

      <details>
        <summary>Screening answers</summary>
        <ul>
          {job.screening_answers.map((answer) => (
            <li key={answer.question}>
              <strong>{answer.question}:</strong> {answer.answer}
            </li>
          ))}
        </ul>
      </details>

      <details>
        <summary>Outreach drafts</summary>
        <ul>
          {job.outreach_drafts.map((draft) => (
            <li key={`${draft.channel}-${draft.purpose}`}>
              <strong>{draft.channel} / {draft.purpose}:</strong> {draft.body}
            </li>
          ))}
        </ul>
      </details>

      <div className="link-row">
        <a href={job.url} target="_blank" rel="noreferrer">
          Source
        </a>
        {job.company_url ? (
          <a href={job.company_url} target="_blank" rel="noreferrer">
            Company site
          </a>
        ) : null}
        {job.tailored_resume_html ? (
          <a href={`/api/artifacts?path=${encodeURIComponent(job.tailored_resume_html)}`} target="_blank" rel="noreferrer">
            Resume preview
          </a>
        ) : null}
      </div>

      <div className="actions">
        <button onClick={onTailor} disabled={busy}>
          Tailor
        </button>
        <button onClick={onApprove} disabled={busy}>
          Approve
        </button>
        <button className="danger" onClick={onReject} disabled={busy}>
          Reject
        </button>
      </div>
    </article>
  );
}
