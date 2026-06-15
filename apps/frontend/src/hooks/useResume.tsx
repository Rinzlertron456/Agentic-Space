import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { ParsedResume } from "@agentic-space/shared";
import { api } from "../services/api";

export interface ResumeSummary {
  id: string;
  fileName: string;
  uploadDate: string;
  skillCount: number;
  experienceCount: number;
  currentRole: string;
  preferredRoles: string[];
}

interface ResumeContextValue {
  resumes: ResumeSummary[];
  uploading: boolean;
  error: string | null;
  upload: (files: FileList | File[]) => Promise<void>;
  remove: (id: string) => Promise<void>;
  getFirst: () => ResumeSummary | null;
  refresh: () => Promise<void>;
}

const ResumeContext = createContext<ResumeContextValue | undefined>(undefined);

function mapParsedResumeToSummary(resume: ParsedResume): ResumeSummary {
  return {
    id: resume?.id || "",
    fileName: resume?.fileName || "Untitled Resume",
    uploadDate: resume?.uploadDate || new Date().toISOString(),
    skillCount: Array.isArray(resume?.skills) ? resume.skills.length : 0,
    experienceCount: Array.isArray(resume?.experience)
      ? resume.experience.length
      : 0,
    currentRole: resume?.currentRole || "",
    preferredRoles: Array.isArray(resume?.preferredRoles)
      ? resume.preferredRoles
      : [],
  };
}

export function ResumeProvider({ children }: { children: ReactNode }) {
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result: any = await api.getResumes();
      if (result.success) {
        setResumes(result.resumes || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);
      setError(null);
      try {
        const result = await api.uploadResume(files);
        if (result.success) {
          const uploaded = (result.resumes || [])
            .map((r: any) => mapParsedResumeToSummary(r.resume || r))
            .filter(Boolean);

          if (uploaded.length > 0) {
            setResumes((prev) => [...uploaded, ...prev]);
          } else {
            await refresh();
          }
        } else {
          setError(result.error || "Upload failed");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [refresh],
  );

  const remove = useCallback(async (id: string) => {
    setResumes((prev) => prev.filter((r) => r.id !== id));
    try {
      await api.deleteResume(id);
    } catch (e) {
      console.error(e instanceof Error ? e.message : e);
    }
  }, []);

  const getFirst = useCallback(() => resumes[0] ?? null, [resumes]);

  return (
    <ResumeContext.Provider
      value={{ resumes, uploading, error, upload, remove, getFirst, refresh }}
    >
      {children}
    </ResumeContext.Provider>
  );
}

export function useResume() {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error("useResume must be used within ResumeProvider");
  }
  return context;
}
