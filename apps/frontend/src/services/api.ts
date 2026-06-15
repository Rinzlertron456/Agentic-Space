import type { SearchFilters, SearchResponse } from "@agentic-space/shared";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  // Resume
  uploadResume: async (files: FileList | File[]) => {
    const form = new FormData();
    for (const file of files) {
      form.append("resumes", file);
    }
    const res = await fetch(`${BASE_URL}/resume/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  },

  getResumes: () =>
    request<{ success: boolean; count: number; resumes: any[] }>("/resume"),
  getResume: (id: string) => request(`/resume/${id}`),
  deleteResume: (id: string) => request(`/resume/${id}`, { method: "DELETE" }),

  // Jobs
  searchJobs: (resumeId: string, filters: SearchFilters) =>
    request<SearchResponse>("/jobs/search", {
      method: "POST",
      body: JSON.stringify({ resumeId, filters }),
    }),

  getJobRedirect: (id: string) => request(`/jobs/${id}/redirect`),

  batchAction: (jobIds: string[], action: string, resumeId?: string) =>
    request("/jobs/batch", {
      method: "POST",
      body: JSON.stringify({ jobIds, action, resumeId }),
    }),

  // Tailor
  tailorResume: (
    resumeId: string,
    jobId: string,
    jobContext?: {
      title?: string;
      description?: string;
      company?: string;
      requirements?: string[];
      skills?: string[];
    },
  ) =>
    request("/tailor", {
      method: "POST",
      body: JSON.stringify({
        resumeId,
        jobId,
        jobTitle: jobContext?.title,
        jobDescription: jobContext?.description,
        jobCompany: jobContext?.company,
        jobRequirements: jobContext?.requirements,
        jobSkills: jobContext?.skills,
      }),
    }),

  // Network
  draftMessage: (
    jobId: string,
    resumeId: string,
    role: string,
    company: string,
  ) =>
    request("/network/linkedin-message", {
      method: "POST",
      body: JSON.stringify({ jobId, resumeId, role, company }),
    }),

  draftReferral: (
    jobId: string,
    resumeId: string,
    connectionName: string,
    role: string,
    company: string,
  ) =>
    request("/network/referral-request", {
      method: "POST",
      body: JSON.stringify({ jobId, resumeId, connectionName, role, company }),
    }),

  draftEmail: (
    jobId: string,
    resumeId: string,
    hrEmail: string,
    role: string,
    company: string,
  ) =>
    request("/network/email-hr", {
      method: "POST",
      body: JSON.stringify({ jobId, resumeId, hrEmail, role, company }),
    }),

  // Logs
  getLogs: () => request("/logs"),
  getLogByDate: (date: string) => request(`/logs/${date}`),
};
