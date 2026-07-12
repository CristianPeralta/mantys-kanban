# Tasks: Deploy to Netcup VPS (issue-24-deploy-vps)

Reconstructed from Engram observations id 390 (task plan) and id 391 (apply-progress). 10/11 tasks complete; 5.1 is a PR-description-only runbook, intentionally not a committed file.

**Delivery**: single PR (~220 changed lines, Low risk).

## Phase 1: API Fixes
- [x] 1.1 `apps/api/package.json` — move `prisma` from `devDependencies` to `dependencies`
- [x] 1.2 `apps/api/src/main.ts` — `process.env.PORT || 3002` → `process.env.PORT ?? 3000`
- [x] 1.3 `apps/api/Dockerfile` — full rewrite: two-stage build, runner copies `.prisma`, `dist`, `prisma/` schema, `entrypoint.sh`
- [x] 1.4 `apps/api/entrypoint.sh` — new file (`set -e`, `prisma migrate deploy`, `exec node dist/main`), chmod +x

## Phase 2: Web Fixes
- [x] 2.1 `apps/web/next.config.mjs` — add `output: 'standalone'`
- [x] 2.2 `apps/web/Dockerfile` — new file, three stages (deps→builder→runner), `NEXT_PUBLIC_API_URL` build ARG, CMD `node apps/web/server.js` (path unverified — see design open question)

## Phase 3: Compose + Env
- [x] 3.1 `docker-compose.yml` — remove postgres port 5432; add PORT/WEB_URL to api env; add `web` service
- [x] 3.2 `docker-compose.prod.yml` — new file, GHCR images + `restart: unless-stopped` (omitted `!reset` syntax — deviation, documented safe)
- [x] 3.3 `.env.example` — new/updated file, all 8 vars documented

## Phase 4: CI/CD
- [x] 4.1 `.github/workflows/deploy.yml` — new file: checkout, buildx, GHCR login, build+push API and web, SSH deploy step

## Phase 5: VPS Runbook (PR description only — no committed file)
- [ ] 5.1 Document the 10-step manual VPS runbook in the PR description (DNS, nginx vhosts, Certbot, `.env`, first deploy, seed, verify, enable CD) — **still pending as of archive**, not yet executed against the real VPS

## Test Results
All existing tests pass: 7 suites, 61 tests, 0 failures (`cd apps/api && npm test`).

## Deviations from Design
1. **docker-compose.prod.yml build override**: design specified `build: !reset null` for the api service; omitted because `!reset` isn't universally supported by older docker compose versions. Safe in practice — `image:` overrides any base `build:` context at runtime.
2. **server.js path (open question)**: kept `CMD ["node", "apps/web/server.js"]` per the design's workspace assumption — unverified without a live build; flagged as verify-report W1.
3. **packages/types/package.json COPY in web Dockerfile deps stage**: added per the API Dockerfile pattern (needed for workspace resolution), not explicitly spelled out in the original design snippet.
