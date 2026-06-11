import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "../services/api";

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tailored, setTailored] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [referral, setReferral] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [gmailUrl, setGmailUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) navigate("/jobs");
  }, [id, navigate]);

  const handleApplyLinkedIn = async () => {
    try {
      const redirect: any = await api.getJobRedirect(id || "");
      if (redirect.redirectUrl) window.open(redirect.redirectUrl, "_blank");
    } catch {}
  };

  const handleTailor = async () => {
    if (!id) return;
    setTailored("Loading...");
    try {
      const result: any = await api.tailorResume("", id);
      setTailored(result.message || "Tailored version ready");
    } catch {
      setTailored("Tailoring available when Ollama is connected");
    }
  };

  const handleDraftMessage = async () => {
    if (!id) return;
    setMsg("Generating...");
    try {
      const result: any = await api.draftMessage(id, "", "connection");
      setMsg(result.draft || "Draft generated");
    } catch {
      setMsg("Ollama required for message generation");
    }
  };

  const handleDraftReferral = async () => {
    if (!id) return;
    const name = prompt("Enter your connection's name:") || "Connection";
    setReferral("Generating...");
    try {
      const result: any = await api.draftReferral(id, "", name);
      setReferral(result.draft || "Referral draft ready");
    } catch {
      setReferral("Ollama required for referral drafting");
    }
  };

  const handleEmailHr = async () => {
    if (!id) return;
    const email = prompt("Enter HR email address:") || "";
    if (!email) return;
    setEmailDraft("Generating...");
    try {
      const result: any = await api.draftEmail(id, "", email);
      setEmailDraft(result.draft || "Email draft ready");
      setGmailUrl(result.gmailUrl || null);
    } catch {
      setEmailDraft("Ollama required for email drafting");
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={() => navigate("/jobs")} className="btn-secondary btn-small">← Back</button>
      <div className="card">
        <h2 className="text-base mb-1">Job Actions</h2>
        <p className="text-xs opacity-60 mb-4">Job ID: {id}</p>
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={handleApplyLinkedIn} className="btn-primary flex-1">Apply on LinkedIn</button>
          </div>
          <button onClick={handleTailor} className="btn-secondary w-full">✨ Tailor Resume for this Job</button>
          {tailored && (
            <div className="mt-3 p-3 bg-gray-50 border-2 border-black">
              <p className="font-display font-bold text-xs mb-2">Tailored Resume Preview</p>
              <p className="text-xs whitespace-pre-wrap break-words">{tailored}</p>
            </div>
          )}
          <div className="pt-3 border-t-2 border-black">
            <p className="font-display font-bold text-xs mb-2">🤝 LinkedIn Networking</p>
            <button onClick={handleDraftMessage} className="btn-secondary btn-small w-full mb-2">📝 Draft Connection Message</button>
            {msg && <div className="p-2 bg-gray-50 border border-black text-xs whitespace-pre-wrap break-words mb-2">{msg}</div>}
            <button onClick={handleDraftReferral} className="btn-secondary btn-small w-full mb-2">🔄 Request Referral</button>
            {referral && <div className="p-2 bg-gray-50 border border-black text-xs whitespace-pre-wrap break-words mb-2">{referral}</div>}
            <button onClick={handleEmailHr} className="btn-secondary btn-small w-full">📧 Email HR</button>
            {emailDraft && <div className="p-2 bg-gray-50 border border-black text-xs whitespace-pre-wrap break-words mt-2">{emailDraft}</div>}
            {gmailUrl && <a href={gmailUrl} target="_blank" rel="noopener noreferrer" className="btn-primary btn-small mt-2 w-full block text-center">Open in Gmail ↗</a>}
          </div>
        </div>
      </div>
    </div>
  );
}
