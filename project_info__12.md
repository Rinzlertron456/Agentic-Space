The container is still not starting. We need to check the actual error logs from Cloud Run. The fix removing `ENV PORT=3001` was applied but something else is crashing Node during startup.

**Please run this command** to fetch the container's startup logs — it'll tell us exactly why Node crashed:

```powershell
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=agentic-space-backend AND resource.labels.revision_name=agentic-space-backend-00004-nr7" --limit=20 --format="value(textPayload)" --project=project-c7b591a9-1f61-4a24-85b
```

Paste me the output — it should show the actual JavaScript error (like "Cannot find module", "import not found", or a TypeScript error).

### Most Likely Culprits

1. **Module not found** — `@agentic-space/shared` isn't resolving properly in the runner stage
2. **ESM import issue** — the compiled JS uses ESM imports but something's misconfigured
3. **Startup crash** — an unhandled error in index.ts during server startup

Once I see the error, I'll fix it immediately.