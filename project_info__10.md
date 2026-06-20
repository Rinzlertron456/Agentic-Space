**Easy fix!** Cloud Run **automatically** sets the `PORT` environment variable — you're not allowed to set it yourself. I need to remove that line from `cloudbuild.yaml`.

I'm in Explore Mode right now, so I can't edit the file. But here's exactly what needs to change:

### The Fix

In `cloudbuild.yaml`, delete this line:

```yaml
- '--set-env-vars=PORT=3001'
```

That's it. **5-second fix.**

### Why?

Cloud Run always sets `PORT` to `8080` automatically. Your code in `config.ts` already reads `process.env.PORT || "3001"`, so at runtime on Cloud Run, it will use `8080` (Cloud Run's default). The backend will listen on port 8080, which is exactly what Cloud Run expects.

### How to Apply

Switch to **Act Mode** using the mode selector at the bottom of the chat, then I'll remove that one line and you can re-run:

```powershell
gcloud builds submit --region=asia-southeast1
```

This should be the final fix — the build and push already work, this was the last hurdle.