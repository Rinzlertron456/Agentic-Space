**Found the issue!** The Dockerfile has `ENV PORT=3001` which overrides Cloud Run's automatic `PORT=8080`. Your app listens on 3001, Cloud Run checks 8080 — they don't match.

Your `config.ts` already handles this properly with `process.env.PORT || "3001"` — so when Cloud Run sets `PORT=8080`, it'll use 8080. The problem is the Dockerfile hardcodes it before Cloud Run can inject its value.

### The Fix

In `Dockerfile`, delete these two lines:

```dockerfile
ENV PORT=3001
EXPOSE 3001
```

Change the `CMD` to this:

```dockerfile
CMD ["node", "dist/index.js"]
```

Once you do that, Cloud Run will inject `PORT=8080`, your app will listen on 8080, and Cloud Run will see it's alive immediately.

### Why This Happened

The flow before the fix:
1. Dockerfile sets `ENV PORT=3001`
2. Cloud Run tries to override with `PORT=8080` — but `ENV` in Dockerfile takes precedence
3. App listens on 3001, Cloud Run health-check fails on 8080
4. Container killed as "failed to start"

After removing `ENV PORT=3001` and `EXPOSE 3001`:
1. Cloud Run sets `PORT=8080` (no Docker override)
2. `config.ts` reads `process.env.PORT || "3001"` → gets `8080`
3. `app.listen(8080)` → Cloud Run health-check passes immediately

Switch to **Act Mode** and I'll apply this fix, then you can run `gcloud builds submit --region=asia-southeast1` one final time.