# Proposal: Deploy to Netcup VPS (api.mantys.studio + kanban.mantys.studio)

Reconstructed from Engram observations (ids 383, 385), change `issue-24-deploy-vps` (GitHub issue #24).

## Intent

mantys-kanban had no production deployment. The goal is automated CD: push to `main` → tests → build API + web images → push to GHCR → SSH deploy on a Netcup VPS, served over HTTPS at `api.mantys.studio` and `kanban.mantys.studio`. Existing Docker assets had blocking bugs (PORT mismatch, broken runner deps, no web image, no standalone build).

Everything is deployed to the same Netcup VPS, not Vercel — see Engram decision `architecture/cicd` ("Deploy: todo en Netcup, no Vercel"): the user's explicit call was to keep the whole stack on one piece of infrastructure rather than split web (Vercel) from API (VPS). The GitHub issue referencing Vercel was noted as stale.

## Scope

### In Scope (repo, single PR)
- Fix `apps/api/src/main.ts` PORT default → 3000
- Fix `apps/api/Dockerfile` — copy `node_modules/.prisma/client` + `package-lock.json` to correct stages
- `apps/web/next.config.mjs` → `output: 'standalone'`
- New `apps/web/Dockerfile` (multi-stage standalone, `NEXT_PUBLIC_API_URL` build ARG)
- Update `docker-compose.yml` — add `web`, drop public postgres port, add PORT/WEB_URL/NEXT_PUBLIC_API_URL
- New `docker-compose.prod.yml` (GHCR images, `restart: unless-stopped`)
- New `.env.example`
- New `.github/workflows/deploy.yml` (build+push GHCR, SSH deploy)
- Prisma: entrypoint runs `prisma migrate deploy` before API start

### Out of Scope
- VPS ops (DNS, nginx vhosts, Certbot, prod `.env`, seed) — runbook only, executed manually
- Blue/green, multi-replica, autoscaling, observability dashboards
- Rollback automation beyond image-tag pinning

## Capabilities

### New Capabilities
- `container-build`: production Docker images for API and web (standalone, baked build args)
- `continuous-deployment`: GHCR push + SSH deploy pipeline on push to main
- `prisma-migration-on-deploy`: automatic `migrate deploy` before API boot

## Approach

GitHub Actions → GHCR → SSH deploy. Versioned images, clean rollback, aligns with existing CI. `NEXT_PUBLIC_API_URL` baked at web build time (Next.js hard constraint). First deploy validated manually before enabling automation. Migrations run via the API entrypoint, not a separate job, to keep compose simple.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `NEXT_PUBLIC_API_URL` baked wrong → API calls fail | Med | Set build ARG `https://api.mantys.studio` in workflow; document in `.env.example` |
| Missing `WEB_URL` → CORS breaks login | Med | Require in prod `.env`; document |
| Public postgres 5432 exposed | High | Remove port mapping; internal network only |
| Weak default secrets (JWT, pg pwd) | High | Generate strong values at deploy; never commit |
| `prisma generate` fails in runner | Med | Generate in builder, copy `.prisma/client` |
| SSH deploy mid-failure leaves stale containers | Low | `pull` before `up -d`; pinned tags allow re-deploy |

## Rollback Plan

Re-deploy previous GHCR image tag via SSH. Repo changes revert by reverting the PR. Migrations are additive; no destructive ops in this change.

## VPS Runbook (outline, manual — NOT committed to the repo)

1. DNS: A records `api.mantys.studio`, `kanban.mantys.studio` → 152.53.89.252
2. nginx vhosts: reverse proxy 3000→API, 3001→web
3. Certbot: `certbot --nginx -d api.mantys.studio -d kanban.mantys.studio`
4. Create `/home/cristo/mantys-kanban/.env` with prod secrets (strong JWT_SECRET, POSTGRES_PASSWORD, WEB_URL, NEXT_PUBLIC_API_URL)
5. First deploy + seed: `docker compose -f docker-compose.prod.yml up -d`, then `docker exec api npx prisma db seed`
6. Add GitHub secrets, push to main to validate CD

> As of archive, this runbook is **unexecuted** — the repo-side automation shipped, but DNS records, nginx vhosts, Certbot certs, GitHub Actions secrets, and the first live deploy had not happened yet. See the reconstruction report for this gap.

## Success Criteria

- [ ] Push to main builds + pushes API + web images to GHCR
- [ ] SSH deploy pulls + restarts containers automatically
- [ ] `https://api.mantys.studio` and `https://kanban.mantys.studio` serve over valid SSL
- [ ] Login works end-to-end from prod domain (CORS + NEXT_PUBLIC_API_URL correct)
- [x] Prisma migrations applied automatically on deploy (entrypoint shipped)
- [x] Postgres port not publicly reachable (fixed in docker-compose.yml)

The unchecked items above depend on the manual VPS runbook, which had not been executed as of archive.
