import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useResume } from "../hooks/useResume";
import { api } from "../services/api";
import type { JobListing } from "@agentic-space/shared";

/** Only allow safe HTTP(S) URLs */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Validate a download path is relative and safe */
function isSafePath(p: string): boolean {
  return p.startsWith("/") && !p.startsWith("//") && !p.includes("://") && !p.includes("..");
}

const SOURCE_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  naukri: "Naukri",
  indeed: "Indeed",
  google_jobs: "Google Jobs",
  company_portal: "Company Portal",
};

function sourceLabel(s: string): string {
  return SOURCE_LABELS[s] || s;
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { getFirst } = useResume();
  const firstResume = getFirst();
  const resumeId = firstResume?.id || "";

  // Job data passed via navigation state from JobBoard
  const navState = location.state as { job?: JobListing } | null;
  const job: JobListing | null = navState?.job ?? null;

  // Whether we have enough job data for actions
  const hasJobData = job !== null;

  // Action states
  const [tailored, setTailored] = useState<string | null>(null);
  const [tailorDownloadUrl, setTailorDownloadUrl] = useState<string | null>(
    null,
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [referral, setReferral] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [gmailUrl, setGmailUrl] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!id) navigate("/jobs");
  }, [id, navigate]);

  // Derive job info for display and API calls
  const jobTitle = job?.title || "Unknown Role";
  const jobCompany = job?.company || "Unknown Company";
  const jobLocation = job?.location || "";
  const jobApplyUrl = job?.applyUrl || "";
  const jobDescription = job?.description || "";
  const jobSource = job?.source || "other";
  const jobMatchScore = job?.matchScore ?? 0;

  // ── Apply ──────────────────────────────────────────────────
  const handleApply = () => {
    if (jobApplyUrl && isSafeUrl(jobApplyUrl)) {
      window.open(jobApplyUrl, "_blank", "noopener,noreferrer");
    }
  };

  // ── Tailor Resume ──────────────────────────────────────────
  const handleTailor = async () => {
    if (!id || !resumeId || !hasJobData) return;
    setActionLoading("tailor");
    setTailored("Tailoring your resume...");
    try {
      const result: any = await api.tailorResume(resumeId, id, {
        title: jobTitle,
        description: jobDescription,
        company: jobCompany,
        requirements: job?.requirements,
        skills: job?.skills,
      });
      if (result.success) {
        setTailored(
          result.tailoredText ||
            result.tailoredMarkdown ||
            "Tailored version ready",
        );
        setTailorDownloadUrl(result.downloadUrl || null);
      } else {
        setTailored(result.error || "Tailoring failed");
      }
    } catch {
      setTailored("Tailoring requires Ollama to be running");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Draft LinkedIn Connection Message ──────────────────────
  const handleDraftMessage = async () => {
    if (!id || !hasJobData) return;
    setActionLoading("message");
    setMsg("Generating...");
    try {
      const result: any = await api.draftMessage(
        id,
        resumeId,
        jobTitle,
        jobCompany,
      );
      if (result.success) {
        setMsg(result.draft);
      } else {
        setMsg(result.error || "Failed to generate message");
      }
    } catch {
      setMsg("Message generation requires Ollama to be running");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Request Referral ───────────────────────────────────────
  const handleDraftReferral = async () => {
    if (!id || !hasJobData) return;
    const name = prompt("Enter your connection's name:");
    if (!name) return;
    setActionLoading("referral");
    setReferral("Generating...");
    try {
      const result: any = await api.draftReferral(
        id,
        resumeId,
        name,
        jobTitle,
        jobCompany,
      );
      if (result.success) {
        setReferral(result.draft);
      } else {
        setReferral(result.error || "Failed to generate referral request");
      }
    } catch {
      setReferral("Referral drafting requires Ollama to be running");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Email HR ───────────────────────────────────────────────
  const handleEmailHr = async () => {
    if (!id || !hasJobData) return;
    const email = prompt("Enter HR email address:");
    if (!email) return;
    setActionLoading("email");
    setEmailDraft("Generating...");
    try {
      const result: any = await api.draftEmail(
        id,
        resumeId,
        email,
        jobTitle,
        jobCompany,
      );
      if (result.success) {
        setEmailDraft(result.draft);
        if (
          result.gmailUrl &&
          isSafeUrl(result.gmailUrl) &&
          result.gmailUrl.startsWith("https://mail.google.com/")
        ) {
          setGmailUrl(result.gmailUrl);
        }
      } else {
        setEmailDraft(result.error || "Failed to generate email");
      }
    } catch {
      setEmailDraft("Email drafting requires Ollama to be running");
    } finally {
      setActionLoading(null);
    }
  };

  // ── No job data state ─────────────────────────────────────
  if (!hasJobData) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/jobs")}
          className="btn-secondary btn-small"
        >
          ← Back to Jobs
        </button>
        <div className="card text-center py-8">
          <span className="text-3xl block mb-2">📋</span>
          <p className="font-display font-bold text-sm">
            Job data unavailable
          </p>
          <p className="text-xs opacity-60 mt-1">
            Navigate from the Job Board to view job details and actions.
          </p>
          <button
            onClick={() => navigate("/jobs")}
            className="btn-primary mt-4"
          >
            Go to Job Board
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate("/jobs")}
        className="btn-secondary btn-small"
      >
        ← Back to Jobs
      </button>

      {/* ── Job Header ──────────────────────────────────── */}
      <div className="card">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-bold text-base leading-tight">
              {jobTitle}
            </h2>
            <p className="text-xs mt-0.5">
              <span className="font-bold">{jobCompany}</span>
              {jobLocation && (
                <span className="opacity-60"> · {jobLocation}</span>
              )}
            </p>
          </div>
          {jobMatchScore > 0 && (
            <span
              className={`shrink-0 px-2 py-0.5 border-2 border-black font-display font-bold text-xs ${
                jobMatchScore >= 70
                  ? "bg-green-300"
                  : jobMatchScore >= 40
                    ? "bg-yellow-300"
                    : "bg-red-200"
              }`}
            >
              {jobMatchScore}%
            </span>
          )}
        </div>

        {/* Source + Posted */}
        <div className="flex gap-2 text-[10px] mb-3">
          <span className="badge bg-cyan-100">{sourceLabel(jobSource)}</span>
          {job.postedDate && (
            <span className="badge bg-gray-100">{job.postedDate}</span>
          )}
          {job.employmentType && (
            <span className="badge bg-lime-100">
              {job.employmentType.replace("_", "-")}
            </span>
          )}
        </div>

        {/* Description */}
        {jobDescription && (
          <div className="mb-3">
            <p className="font-display font-bold text-xs mb-1">Description</p>
            <p className="text-xs opacity-80 whitespace-pre-wrap break-words">
              {jobDescription}
            </p>
          </div>
        )}

        {/* Skills / Requirements */}
        {job.skills && job.skills.length > 0 && (
          <div className="mb-3">
            <p className="font-display font-bold text-xs mb-1">Skills</p>
            <div className="flex flex-wrap gap-1">
              {job.skills.map((s) => (
                <span
                  key={s}
                  className="px-1.5 py-0.5 bg-yellow-200 border border-black text-[10px] font-display font-bold"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {job.requirements && job.requirements.length > 0 && (
          <div className="mb-3">
            <p className="font-display font-bold text-xs mb-1">Requirements</p>
            <ul className="text-xs opacity-80 list-disc list-inside">
              {job.requirements.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Actions ─────────────────────────────────────── */}
      <div className="card">
        <h3 className="font-display font-bold text-sm mb-3">Actions</h3>

        {/* Apply */}
        <button
          onClick={handleApply}
          disabled={!jobApplyUrl || !isSafeUrl(jobApplyUrl)}
          className="btn-primary w-full mb-2"
        >
          {jobApplyUrl && isSafeUrl(jobApplyUrl)
            ? `Apply on ${sourceLabel(jobSource)} ↗`
            : "No apply URL available"}
        </button>

        {/* Tailor Resume */}
        <button
          onClick={handleTailor}
          disabled={actionLoading === "tailor" || !resumeId}
          className="btn-secondary w-full mb-2"
        >
          {actionLoading === "tailor"
            ? "Tailoring..."
            : !resumeId
              ? "Upload resume to tailor"
              : "✨ Tailor Resume for this Job"}
        </button>
        {tailored && (
          <div className="p-3 bg-gray-50 border-2 border-black mb-2">
            <p className="font-display font-bold text-xs mb-2">
              Tailored Resume Preview
            </p>
            <p className="text-xs whitespace-pre-wrap break-words">
              {tailored}
            </p>
            {tailorDownloadUrl && isSafePath(tailorDownloadUrl) && (
              <a
                href={`${import.meta.env.VITE_API_URL || "/api"}${tailorDownloadUrl.replace(/^\/api/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary btn-small mt-2 inline-block"
              >
                Download Tailored Resume ↗
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── Networking ──────────────────────────────────── */}
      <div className="card">
        <h3 className="font-display font-bold text-xs mb-3">
          🤝 LinkedIn Networking
        </h3>

        {/* Draft Connection Message */}
        <button
          onClick={handleDraftMessage}
          disabled={actionLoading === "message"}
          className="btn-secondary btn-small w-full mb-2"
        >
          {actionLoading === "message"
            ? "Generating..."
            : "📝 Draft Connection Message"}
        </button>
        {msg && (
          <div className="p-2 bg-gray-50 border border-black text-xs whitespace-pre-wrap break-words mb-2">
            {msg}
          </div>
        )}

        {/* Request Referral */}
        <button
          onClick={handleDraftReferral}
          disabled={actionLoading === "referral"}
          className="btn-secondary btn-small w-full mb-2"
        >
          {actionLoading === "referral"
            ? "Generating..."
            : "🔄 Request Referral"}
        </button>
        {referral && (
          <div className="p-2 bg-gray-50 border border-black text-xs whitespace-pre-wrap break-words mb-2">
            {referral}
          </div>
        )}

        {/* Email HR */}
        <button
          onClick={handleEmailHr}
          disabled={actionLoading === "email"}
          className="btn-secondary btn-small w-full"
        >
          {actionLoading === "email" ? "Generating..." : "📧 Email HR"}
        </button>
        {emailDraft && (
          <div className="p-2 bg-gray-50 border border-black text-xs whitespace-pre-wrap break-words mt-2">
            {emailDraft}
          </div>
        )}
        {gmailUrl && (
          <a
            href={gmailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary btn-small mt-2 w-full block text-center"
          >
            Open in Gmail ↗
          </a>
        )}
      </div>

      {/* ── No resume warning ───────────────────────────── */}
      {!resumeId && (
        <div className="card bg-yellow-100 border-yellow-400">
          <p className="text-xs font-bold">
            💡 Upload a resume to enable tailoring and personalized networking
            messages.
          </p>
        </div>
      )}
    </div>
  );
}
