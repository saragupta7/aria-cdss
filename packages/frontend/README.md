# frontend

React + Vite + Tailwind single-page app for the ARIA CDSS: login, live ward
dashboards, patient detail with vitals charts and SHAP explanations, alert
center, audit trail, staff management, and a Training Sandbox.

Talks to the backend REST API (`packages/backend`, port 5001) with JWT auth;
shared request/response types live in `@aria/shared`.

## Running

From the repo root:

```bash
pnpm install
pnpm dev:fe        # or `pnpm dev` to run backend + frontend together
```

The dev server runs on http://localhost:5173. See the root
[README](../../README.md) for full setup (backend env, ml-service, seeding).
