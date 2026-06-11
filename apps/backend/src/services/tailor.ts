export interface TailorResult {
  success: boolean;
  tailoredText?: string;
  downloadUrl?: string;
  error?: string;
}

export async function tailorResume(resumeId: string, jobId: string): Promise<TailorResult> {
  // TODO: Implement using Ollama for resume tailoring
  return {
    success: false,
    error: "Resume tailoring not yet implemented - requires Ollama integration",
  };
}
