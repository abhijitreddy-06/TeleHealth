# Phase 0: Baseline and Guardrails

This phase defines the minimum deployment safety rules before feature work.

## Guardrails

- Next.js owns all UI navigation and page routes.
- Express is API-only and returns JSON-first contracts.
- Auth/session API surface is under `/api/auth/*`.
- Local development may use localhost fallbacks.
- Production must never silently fall back to localhost.

## Environment Matrix

| Environment | Backend `NODE_ENV` | Frontend `NODE_ENV` | Required Backend Vars | Required Frontend Vars | Fallback Behavior | Expected Startup Behavior |
|---|---|---|---|---|---|---|
| Local | `development` | `development` | `DATABASE_URL`, `ACCESS_TOKEN_SECRET` (or `JWT_SECRET`), `REFRESH_TOKEN_SECRET` | none | Backend defaults `PORT=10000`; frontend server proxy defaults to `http://localhost:10000` if `NEXT_SERVER_API_URL` is missing | Backend and frontend both start with local defaults |
| Staging | `production` | `production` | `DATABASE_URL`, `ACCESS_TOKEN_SECRET` (or `JWT_SECRET`), `REFRESH_TOKEN_SECRET`, `FRONTEND_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | `NEXT_SERVER_API_URL` | No localhost fallback allowed for `NEXT_SERVER_API_URL` | Frontend fails fast at boot if `NEXT_SERVER_API_URL` is missing |
| Production | `production` | `production` | `DATABASE_URL`, `ACCESS_TOKEN_SECRET` (or `JWT_SECRET`), `REFRESH_TOKEN_SECRET`, `FRONTEND_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | `NEXT_SERVER_API_URL` | No localhost fallback allowed for `NEXT_SERVER_API_URL` | Frontend fails fast at boot if `NEXT_SERVER_API_URL` is missing |

## Source of Truth Files

- Backend env template: [.env.example](../.env.example)
- Frontend env template: [telehealth-frontend/.env.example](../telehealth-frontend/.env.example)

Use these files as the only canonical variable checklists.

## Backend Environment Checklist

Required for startup:

- `DATABASE_URL`
- `ACCESS_TOKEN_SECRET` or `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`

Required for production-safe runtime:

- `FRONTEND_URL` (cookie/CORS alignment)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

Optional:

- `PORT` (default: `10000`)
- `REDIS_URL` (app runs without cache if absent)
- `ACCESS_TOKEN_EXPIRE_MINUTES` (default: `15`)
- `REFRESH_TOKEN_EXPIRE_DAYS` (default: `7`)

## Frontend Environment Checklist

Required for staging and production:

- `NEXT_SERVER_API_URL` (absolute backend origin used by Next rewrites)

Optional:

- `NEXT_PUBLIC_API_URL` (client-side API base override; default in code is `"/backend"` for same-origin proxying)

## Deterministic Startup Criteria

Phase 0 is complete only if all criteria below are true:

- Local startup is deterministic: backend and frontend run with documented defaults.
- Staging startup is deterministic: missing required variables causes immediate, explicit startup failure.
- Production startup is deterministic: no hidden localhost fallbacks.
- Engineers can identify required variables from the two `.env.example` files without inspecting source code.

## Done Criteria

- Team can point to one source of truth for backend and frontend environment variables.
- Team can explain fallback behavior in local vs production without ambiguity.
- Startup behavior is repeatable and explicit in local, staging, and production.