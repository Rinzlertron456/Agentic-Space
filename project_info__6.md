# GCP Deployment Fixes — Implementation Checklist

- [x] Fix 1: Add `packages/shared/package.json` to Docker runner stage
- [x] Fix 2: Guard `.env` loading in production (config.ts)
- [x] Fix 3: Update cloudbuild.yaml (env vars, secrets, memory, timeout)
- [x] Fix 4: Deprecate apps/backend/Dockerfile to avoid confusion
- [x] Fix 5: Update vercel.json with correct Cloud Run URL
- [ ] Fix 6: Verify deployment works with `gcloud builds submit`
