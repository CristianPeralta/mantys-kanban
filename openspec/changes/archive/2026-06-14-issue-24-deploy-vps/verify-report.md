# Verify Report: Deploy to Netcup VPS (issue-24-deploy-vps)

Reconstructed from Engram observations id 398 (verify-report) and id 407 (archive-report). Verdict: PASS WITH WARNINGS.

## Test Results
`cd apps/api && npm test` — 7 suites, 61 tests, 0 failures, 1.813s.

## Task Completion
10/11 tasks complete. Task 5.1 (PR-description runbook) intentionally deferred, not a blocking issue.

## Spec Compliance

All `container-build`, `continuous-deployment`, and `prisma-migration-on-deploy` requirements PASS except the one warning below on `NEXT_PUBLIC_API_URL` default consistency. Security checks (postgres 5432 not exposed in either compose file, `.env.example` has no real secrets) all PASS.

## Issues

### WARNINGS (3)

**W1 — server.js path in web Dockerfile CMD (unverified assumption)**
CMD is `["node", "apps/web/server.js"]` per the workspace assumption; standalone output in an npm workspace may instead place `server.js` at the standalone root. Cannot be verified without a live `next build` in the monorepo. If wrong, the web container fails to start. **Action**: run a build and check the actual path before/at first real deploy.

**W2 — docker-compose.prod.yml build override relies on override precedence**
The prod compose omits `build: !reset null` (unsupported syntax). In practice `image:` takes precedence over the base file's `build:` context at runtime, so this is safe, but relies on operators always running with `-f docker-compose.yml -f docker-compose.prod.yml` together.

**W3 — NEXT_PUBLIC_API_URL default inconsistency**
`apps/web/Dockerfile` ARG defaults to `http://localhost:3002` (old API port); `docker-compose.yml` build arg defaults to `http://localhost:3000` (current API port). Compose always overrides the Dockerfile ARG in practice, so this is cosmetic — but confusing, and risky if the image is ever built standalone outside compose. **Recommended**: align the Dockerfile ARG default to `localhost:3000`.

### SUGGESTIONS (1)

**S1 — deploy.yml does not gate on CI passing**
Spec says the workflow SHOULD run after the test suite passes; the workflow has no `needs:`/`workflow_run` dependency on CI. Safe today because branch protection requires CI before merge to main, but the SHOULD requirement isn't met at the workflow level.

## Verdict
PASS WITH WARNINGS — 0 CRITICAL, 3 WARNING (cosmetic/pre-merge validation items), 1 SUGGESTION.

## Known Risks Carried Into Production (per archive-report)

| Risk | Severity | Status |
|------|----------|--------|
| `server.js` path wrong in web Dockerfile | Med | Open — needs live-build validation |
| `NEXT_PUBLIC_API_URL` baked at build → URL change needs rebuild | Med | Accepted (Next.js constraint) |
| Missing `WEB_URL` in prod `.env` → CORS breaks login | Med | Mitigated via `.env.example` + runbook |
| Public postgres port 5432 | High | FIXED — removed from both compose files |
| Weak default secrets | High | Mitigated via placeholder-only `.env.example` + runbook instructing `openssl rand -hex 32` |
| `prisma generate` fails in runner | Med | FIXED — `prisma` moved to `dependencies` |
| SSH deploy mid-failure leaves stale containers | Low | Mitigated — pinned image tags allow re-deploy |

## Permanent Conventions Established

1. API Dockerfile pattern: two-stage build, `.prisma/client` copy from builder, `npm ci --omit=dev`, entrypoint script.
2. Web Dockerfile pattern: three-stage (deps→builder→runner), standalone output, `NEXT_PUBLIC_API_URL` build ARG.
3. Compose layering: base `docker-compose.yml` for local dev + `docker-compose.prod.yml` for prod overrides, always combined via `-f`.
4. GitHub Actions → GHCR: build-push-action for API and web, env vars baked at build.
5. `prisma` CLI belongs in `dependencies`, not `devDependencies`, for any Docker-deployed NestJS+Prisma service in this repo.
6. VPS: always validate infra manually before enabling CD.

## Status as of Archive

**Repo-side automation shipped and merged (PR #48).** The VPS-side runbook (DNS, nginx vhosts, Certbot SSL, GitHub Actions secrets, first live deploy, seed) was **not yet executed** — this is a legitimate open gap, not a documentation oversight. See the reconstruction report for the related undocumented follow-up, PR #49 (`fix/docker-monorepo-deps`), which has no corresponding Engram SDD trail.
