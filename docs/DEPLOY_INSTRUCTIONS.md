# Agentic Space — GCP Deployment Step-by-Step Guide

> **Last updated**: 2026-06-20  
> **Status**: Successfully deployed and upload issues fixed ✅

---

## What Was Fixed

| Issue | Root cause | Fix |
|-------|-----------|-----|
| `pnpm install` failed in CI with exit code 1 | pnpm requires `CI=true` in non-interactive environments | Added `ENV CI=true` to Dockerfile build stage |
| `ERR_MODULE_NOT_FOUND: Cannot find package 'express'` on Cloud Run | pnpm creates symlinks in `node_modules`; Docker multi-stage `COPY` breaks them | Added `--shamefully-hoist` to flatten `node_modules` without symlinks |
| pnpm not found in runner stage | Runner stage is `node:22-alpine` with no pnpm installed | Added `npm install -g pnpm@11.5.2` in runner stage |
| 503 on `/api/resume/upload` during runtime | Cloud Run filesystem is read-only except `/tmp`; Multer + resume store tried writing to `/app/uploads` and `/app/logs` | Uploads now write to `/tmp/uploads` and resume store to `/tmp/resumes` in production |

---

## Cloud Run Service

- Service: `agentic-space-backend`
- Region: `asia-southeast1`
- URL: `https://agentic-space-backend-242431895873.asia-southeast1.run.app`
- Health: `GET https://agentic-space-backend-242431895873.asia-southeast1.run.app/api/health`

IAM permission for Secret Manager (`openai-api-key`) has already been granted.

---

## Deploy / Redeploy

```powershell
gcloud builds submit --region=asia-southeast1
```

After deploying, update the frontend:

```powershell
cd apps/frontend
npx vercel --prod
```

Make sure `apps/frontend/vercel.json` points to the Cloud Run backend URL above.

---

## Quick Test

```powershell
Invoke-RestMethod -Uri "https://agentic-space-backend-242431895873.asia-southeast1.run.app/api/health"
```
