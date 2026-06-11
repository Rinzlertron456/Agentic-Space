import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tailored, setTailored] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <button onClick={() => navigate("/jobs")} className="btn-secondary btn-small">← Back</button>
      <div className="card">
        <h2 className="text-base mb-1">Job Details</h2>
        <p className="text-xs opacity-60 mb-4">Job ID: {id}</p>
        <div className="space-y-3">
          <div className="flex gap-2">
            <button className="btn-primary flex-1">Apply on LinkedIn</button>
            <button className="btn-secondary flex-1">Company Site</button>
          </div>
          <button onClick={() => setTailored("Tailored version would appear here...")} className="btn-secondary w-full">✨ Tailor Resume for this Job</button>
          {tailored && <div className="mt-3 p-3 bg-gray-50 border-2 border-black"><p className="font-display font-bold text-xs mb-2">Tailored Resume Preview</p><p className="text-xs whitespace-pre-wrap">{tailored}</p><button className="btn-primary btn-small mt-2 w-full">Download DOCX</button></div>}
          <div className="pt-3 border-t-2 border-black">
            <p className="font-display font-bold text-xs mb-2">LinkedIn Networking</p>
            <button className="btn-secondary btn-small w-full mb-2">📝 Draft Connection Message</button>
            <button className="btn-secondary btn-small w-full mb-2">🔄 Request Referral</button>
            <button className="btn-secondary btn-small w-full">📧 Email HR</button>
          </div>
        </div>
      </div>
    </div>
  );
}
