Security notes for backend secrets

- Do NOT commit `serviceAccountKey.json` or any private keys to Git.
- Add `backend/serviceAccountKey.json` and `backend/.env` to `.gitignore` (already done).

If you accidentally committed `serviceAccountKey.json`:

1. Remove it from the repository index and commit:

   git rm --cached backend/serviceAccountKey.json
   git commit -m "remove service account from repo"
   git push

2. Rotate the exposed Firebase service account keys in the Google Cloud Console immediately.

To run locally without a file:

- Set the `FIREBASE_ADMIN_KEY` environment variable to the JSON content of the service account.
  On PowerShell:

  $env:FIREBASE_ADMIN_KEY = (Get-Content -Raw path\to\serviceAccountKey.json)
  $env:STRIPE_SECRET_KEY = "sk_test_xxx"
  $env:STRIPE_WEBHOOK_SECRET = "whsec_xxx"
  node server.js

Or copy `backend/.env.example` → `backend/.env` and fill values, then start server.

For production:

- Store secrets in your host's secret manager (Azure Key Vault, AWS Secrets Manager, GCP Secret Manager) and inject them as environment variables.
- Use least privilege for service account roles.
- Rotate keys regularly and monitor access logs.
