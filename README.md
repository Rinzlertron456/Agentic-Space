# Mobile Job Agent

Approval-gated job discovery, resume tailoring, outreach drafting, and mobile review for India-focused software roles.

## What This Implements

- Mobile-first Next.js dashboard for queue review, per-job approval, batch approval, resume previews, and logs.
- Safe-mode TypeScript runner that creates LinkedIn, Naukri, and company-careers search leads using your target roles and locations.
- Python SQLite store with WAL mode as the canonical state database.
- Python resume tailoring that generates ATS-friendly `.docx` and `.html` artifacts from truthful resume facts.
- Hourly cloud scheduler that runs only when enabled from the dashboard.
- Docker Compose setup for a cloud VM or local always-on host.
- Local log mirrors: Word `.docx`, Google Docs-ready Markdown, and Notion-ready JSON.

## Quick Start

```powershell
npm install
npm run db:init
npm run runner:discover
npm run dev
```

Open `http://localhost:3000` on your phone if it is on the same network as the PC, or deploy the Docker service to a cloud server for access when the PC is unavailable.

## Resume Source

Local default:

```text
C:\Users\devan\Downloads\Full_Stack_AI_Developer_Resume.docx
```

Cloud default:

```text
/app/input/Full_Stack_AI_Developer_Resume.docx
```

For Docker, place the master resume at:

```text
input/Full_Stack_AI_Developer_Resume.docx
```

## Safe-Mode Rules

- LinkedIn and Naukri logged-in actions remain human-in-the-loop.
- The agent drafts referral, hiring-team, and authenticity-check messages but does not send them without approval.
- Company-site application links are prioritized when available.
- The runner stops for CAPTCHA, payments, sensitive identity prompts, password/OTP prompts, or unclear consent prompts.
- Per-job approval is default; batch approval is available in the dashboard.

## Mobile Cloud Deployment

1. Copy `.env.example` to `.env`.
2. Set `ADMIN_PASSWORD` to a strong password.
3. Place the resume source in `input/Full_Stack_AI_Developer_Resume.docx`.
4. Run:

```bash
docker compose up --build -d
```

Expose the service through HTTPS using your cloud provider, reverse proxy, or platform routing. The app uses HTTP Basic Auth when `ADMIN_PASSWORD` is set to anything other than `change-this-before-deploy`.

## Commands

```bash
npm run db:init          # initialize SQLite
npm run runner:discover  # create ranked safe-mode leads and tailor the top 10
npm run logs:sync        # write Word, Markdown, and JSON log mirrors
npm run dev              # local dashboard
npm run build            # production build
npm run scheduler:start  # hourly worker process
```

## Current Limits

This is intentionally not a stealth bot. It creates high-quality review queues, tailored resumes, screening answers, and outreach drafts. Actual LinkedIn/Naukri account actions should happen through approved browser sessions because those platforms restrict unauthorized automated activity.
