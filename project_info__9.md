We're now 2 out of 3 steps done:
- ✅ Step 0 (Docker build) — passed
- ✅ Step 1 (Push to Artifact Registry) — passed
- ❌ Step 2 (Cloud Run deploy) — still failing

**New error:** `Permission 'iam.serviceaccounts.actAs' denied`

Cloud Run needs to "act as" a service account to run the container. The Cloud Build service account needs the **Service Account User** role.

Run this command in your terminal:

```powershell
gcloud iam service-accounts add-iam-policy-binding 242431895873-compute@developer.gserviceaccount.com --member=serviceAccount:242431895873-compute@developer.gserviceaccount.com --role=roles/iam.serviceAccountUser --project=project-c7b591a9-1f61-4a24-85b
```

Then re-deploy:

```powershell
gcloud builds submit --region=asia-southeast1
```

**Why this happened:** Cloud Run needs permission to impersonate a service account when running your container. The Cloud Build service account acts as the deployer, and Cloud Run runs as a service account — the `iam.serviceAccountUser` role bridges that gap.

After this command, the deploy should succeed and you'll finally see `agentic-space-backend` in the Cloud Run console.