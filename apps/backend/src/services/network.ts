import { generate } from "./ollama.js";
import { getResume } from "./resume-store.js";
import { log } from "./logger.js";

interface MessageResult {
  success: boolean;
  draft: string;
  error?: string;
}

export async function draftConnectionMessage(
  jobId: string,
  resumeId: string,
  role: string,
  company: string
): Promise<MessageResult> {
  try {
    const resume = getResume(resumeId);
    const summary = resume?.summary || "";
    const currentRole = resume?.currentRole || "";
    const skills = resume?.skills?.map((s) => s.name).join(", ") || "";

    const prompt = `Draft a professional LinkedIn connection request message (max 300 characters) to the hiring manager or recruiter at ${company} for the ${role} position.

About me:
- Current/Latest role: ${currentRole}
- Summary: ${summary}
- Key skills: ${skills}

The message should:
1. Be polite and professional
2. Mention interest in the ${role} role at ${company}
3. Briefly highlight my relevant background
4. Request a brief conversation to learn more
5. Include a call to action

Return ONLY the message body. No subject line. Max 300 characters.`;

    const draft = await generate(prompt);
    log("linkedin_message_drafted", `Connection message drafted for ${role} at ${company}`, { jobId, resumeId });

    return { success: true, draft: draft.trim() };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Failed to draft message";
    return { success: false, draft: "", error: errorMsg };
  }
}

export async function draftReferralRequest(
  jobId: string,
  resumeId: string,
  connectionName: string,
  role: string,
  company: string
): Promise<MessageResult> {
  try {
    const resume = getResume(resumeId);
    const summary = resume?.summary || "";
    const currentRole = resume?.currentRole || "";
    const skills = resume?.skills?.map((s) => s.name).join(", ") || "";

    const prompt = `Draft a LinkedIn message asking ${connectionName} for a referral for the ${role} position at ${company}.

About me:
- Current/Latest role: ${currentRole}
- Summary: ${summary}
- Key skills: ${skills}

The message should:
1. Greet ${connectionName} politely
2. Mention our existing connection
3. Express interest in the ${role} role at ${company}
4. Explain why I'm a good fit
5. Politely ask if they would be comfortable submitting a referral
6. Offer to share my resume and any additional details

Return ONLY the message body. Professional and warm tone. Max 400 characters.`;

    const draft = await generate(prompt);
    log("linkedin_message_drafted", `Referral request drafted for ${connectionName} re: ${role} at ${company}`, { jobId, resumeId });

    return { success: true, draft: draft.trim() };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Failed to draft referral request";
    return { success: false, draft: "", error: errorMsg };
  }
}

export async function draftHrEmail(
  jobId: string,
  resumeId: string,
  hrEmail: string,
  role: string,
  company: string
): Promise<{ success: boolean; draft: string; subject: string; gmailUrl: string; error?: string }> {
  try {
    const resume = getResume(resumeId);
    const summary = resume?.summary || "";
    const currentRole = resume?.currentRole || "";
    const skills = resume?.skills?.map((s) => s.name).join(", ") || "";

    const prompt = `Draft a professional job application email to the HR team at ${company} regarding the ${role} position.

About me:
- Current/Latest role: ${currentRole}
- Summary: ${summary}
- Key skills: ${skills}

The email should:
1. Have a clear subject line
2. Express interest in the ${role} position
3. Briefly highlight relevant experience and skills
4. Mention that the resume is attached
5. Request next steps in the interview process
6. Include a professional closing

Format:
Subject: [clear subject line]
[body]`;

    const result = await generate(prompt);
    const lines = result.trim().split("\n");
    const subjectLine = lines.find((l) => l.toLowerCase().startsWith("subject:"))?.replace(/^subject:\s*/i, "") || `Application for ${role} at ${company}`;
    const body = lines.filter((l) => !l.toLowerCase().startsWith("subject:")).join("\n").trim();

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(hrEmail)}&su=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`;

    log("email_drafted", `HR email drafted for ${role} at ${company} to ${hrEmail}`, { jobId, resumeId });

    return { success: true, draft: body, subject: subjectLine, gmailUrl };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Failed to draft email";
    return { success: false, draft: "", subject: "", gmailUrl: "", error: errorMsg };
  }
}
