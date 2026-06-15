import { useNavigate } from "react-router-dom";
import { ResumeUpload } from "../components/ResumeUpload";
import { useResume } from "../hooks/useResume";

export default function Dashboard() {
  const { resumes, uploading, error, upload, remove } = useResume();
  const navigate = useNavigate();
  const allResumes = resumes;

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl mb-1">Upload Resume</h2>
        <p className="text-xs opacity-60">
          Upload your resume to analyze skills and find matching jobs
        </p>
      </div>

      <ResumeUpload onUpload={upload} uploading={uploading} />

      {error && (
        <div className="card bg-red-100 border-red-400">
          <p className="text-xs font-bold text-red-600">{error}</p>
        </div>
      )}

      {uploading && (
        <div className="card text-center py-8">
          <span className="text-3xl block mb-2">🔄</span>
          <p className="font-display font-bold text-sm">
            Analyzing your resume...
          </p>
          <p className="text-xs opacity-60 mt-1">
            Extracting skills, experience, and matching roles
          </p>
        </div>
      )}

      {allResumes.length > 0 && !uploading && (
        <div className="space-y-3">
          <h3 className="font-display font-bold text-sm">
            Uploaded Resumes ({allResumes.length})
          </h3>

          {allResumes.map((resume, idx) => (
            <div key={resume.id || idx} className="card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-sm truncate">
                    {resume.fileName}
                  </p>

                  {resume.currentRole && (
                    <p className="text-xs mt-0.5">
                      <span className="opacity-60">Current/Last Role:</span>{" "}
                      <span className="font-bold">{resume.currentRole}</span>
                    </p>
                  )}

                  {/* Skills */}
                  {resume.skillCount > 0 && (
                    <div className="flex gap-2 mt-2 text-[10px]">
                      <span className="badge bg-cyan-100">
                        {resume.skillCount} skills
                      </span>
                      {resume.experienceCount > 0 && (
                        <span className="badge bg-lime-100">
                          {resume.experienceCount} roles
                        </span>
                      )}
                    </div>
                  )}

                  {/* Suggested Roles */}
                  {resume.preferredRoles?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {resume.preferredRoles.slice(0, 5).map((role) => (
                        <span
                          key={role}
                          className="inline-block px-1.5 py-0.5 bg-yellow-200 border border-black text-[10px] font-display font-bold"
                        >
                          {role}
                        </span>
                      ))}
                      {resume.preferredRoles.length > 5 && (
                        <span className="text-[10px] opacity-60 self-center">
                          +{resume.preferredRoles.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => navigate("/jobs")}
                    className="btn-primary btn-small"
                  >
                    Find Jobs
                  </button>
                  <button
                    onClick={() => remove(resume.id)}
                    className="btn-danger btn-small"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {allResumes.length === 0 && !uploading && (
        <div className="text-center py-8">
          <span className="text-3xl block mb-2">📄</span>
          <p className="text-sm opacity-60">No resumes uploaded yet</p>
          <p className="text-xs opacity-40 mt-1">
            Drop a PDF or DOCX file above to get started
          </p>
        </div>
      )}
    </div>
  );
}
