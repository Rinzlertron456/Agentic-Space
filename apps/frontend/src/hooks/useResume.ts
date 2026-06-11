import { useState, useCallback } from "react";
import type { ParsedResume } from "@agentic-space/shared";
import { api } from "../services/api";

export function useResume() {
  const [resumes, setResumes] = useState<ParsedResume[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    setError(null);
    try {
      const result = await api.uploadResume(files);
      if (result.success) {
        setResumes((prev) => [
          ...prev,
          ...result.resumes.map((r: any) => r.parsed),
        ]);
      } else {
        setError(result.error || "Upload failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const remove = useCallback((id: string) => {
    setResumes((prev) => prev.filter((r) => r.id !== id));
    api.deleteResume(id).catch(console.error);
  }, []);

  const getFirst = useCallback(() => resumes[0] ?? null, [resumes]);

  return { resumes, uploading, error, upload, remove, getFirst };
}
