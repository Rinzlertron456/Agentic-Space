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

  getResume: (id: string) => request(`/resume/${id}`),
  deleteResume: (id: string) => request(`/resume/${id}`, { method: "DELETE" }),

  // Jobs
  searchJobs: (resumeId: string, filters: SearchFilters) =>
    request<SearchResponse>("/jobs/search", {
      method: "POST",
      body: JSON.stringify({ resumeId, filters }),
    }),

  getJob: (id: string) => request(`/jobs/${id}`),
  getJobRedirect: (id: string) => request(`/jobs/${id}/redirect`),

  batchAction: (jobIds: string[], action: string) =>
    request("/jobs/batch", {
      method: "POST",
      body: JSON.stringify({ jobIds, action }),
    }),

  // Tailor
  tailorResume: (resumeId: string, jobId: string) =>
    request("/tailor", {
      method: "POST",
      body: JSON.stringify({ resumeId, jobId }),
    }),

  // Network
  draftMessage: (jobId: string, resumeId: string, messageType: string) =>
    request("/network/linkedin-message", {
      method: "POST",
      body: JSON.stringify({ jobId, resumeId, messageType }),
    }),

  draftReferral: (jobId: string, resumeId: string, connectionName: string) =>
    request("/network/referral-request", {
      method: "POST",
      body: JSON.stringify({ jobId, resumeId, connectionName }),
    }),

  draftEmail: (jobId: string, resumeId: string, hrEmail: string) =>
    request("/network/email-hr", {
      method: "POST",
      body: JSON.stringify({ jobId, resumeId, hrEmail }),
    }),

  // Logs
  getLogs: () => request("/logs"),
  getLogByDate: (date: string) => request(`/logs/${date}`),
};
