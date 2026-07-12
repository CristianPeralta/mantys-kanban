# deployment

Current-state spec, synthesized from `openspec/changes/archive/2026-06-14-issue-24-deploy-vps/`, plus two undocumented follow-up commits on `main` noted below (no SDD trail — see the reconstruction report).

## Purpose

Containerized API + web, deployed via GitHub Actions CD to a single Netcup VPS — never split across Vercel/other providers (explicit user decision: everything on one piece of infrastructure).

## Requirements

### Requirement: API Multi-Stage Dockerfile

`apps/api/Dockerfile` uses a multi-stage build. The runner stage copies `node_modules/.prisma/client` from the builder stage and has `package-lock.json` available for deterministic installs. `PORT` defaults to `3000`.

> As shipped and later hardened by an undocumented follow-up commit (`c831b82`, `fix(docker): fix API module resolution in npm workspaces monorepo`, no SDD trail): the build is actually **three-stage** (builder → pruner → runner) so npm-workspace `node_modules` hoisting is preserved instead of reinstalling from scratch; `class-validator`/`class-transformer` are symlinked into `apps/api/node_modules` since `@nestjs/common` cannot resolve them from the hoisted root location; the entrypoint uses the workspace-local `prisma` binary and the correct NestJS output path (`dist/src/main`, not `dist/main`); an initial Prisma migration was generated from the live schema (replacing an earlier `db push`-only approach).

### Requirement: Web Multi-Stage Dockerfile

`apps/web/Dockerfile` accepts `NEXT_PUBLIC_API_URL` as a build ARG, baked in at `next build` time (a Next.js hard constraint — client env vars are compile-time). Uses Next.js standalone output as the runtime artifact (`next.config.mjs` sets `output: 'standalone'`).

### Requirement: docker-compose Configuration

`docker-compose.yml` includes a `web` service on port 3001, passes `PORT`/`WEB_URL`/`NEXT_PUBLIC_API_URL`, and does NOT publish Postgres port 5432 to the host. `docker-compose.prod.yml` layers GHCR image references + `restart: unless-stopped` on top (`-f docker-compose.yml -f docker-compose.prod.yml`), also without exposing Postgres.

### Requirement: CD Workflow

`.github/workflows/deploy.yml` triggers on push to `main` (relies on branch protection requiring CI to pass first — no explicit `needs:`/`workflow_run` dependency on the CI workflow). It also has a `workflow_dispatch` trigger for manual runs (added by an undocumented follow-up commit `900238c`, no SDD trail). It builds + pushes API and web images to `ghcr.io/cristianperalta/mantys-kanban/{api,web}:latest` and `:{sha}`, then SSHes into the VPS and runs `docker compose -f docker-compose.yml -f docker-compose.prod.yml pull && ... up -d --remove-orphans`.

Required secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `GHCR_TOKEN`.

### Requirement: Automatic Migration on Container Start

The API container runs `npx prisma migrate deploy` in its entrypoint before starting the NestJS server. If the migration fails, the server process does not start and the container exits non-zero.

### Requirement: Environment Variables Documentation

`.env.example` at the repo root documents `DATABASE_URL`, `JWT_SECRET`, `WEB_URL`, `PORT`, `NEXT_PUBLIC_API_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.

## Known Gaps (as of the latest archived change)

- The four GitHub Actions secrets (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `GHCR_TOKEN`) had not yet been added to the repo as of the `issue-24-deploy-vps` archive — the deploy job is defined but was not confirmed to have run end-to-end against the real VPS in the source material.
- The exact path of the emitted `server.js` inside the npm-workspace standalone build (`apps/web/server.js` vs. a root `server.js`) was flagged as unverified without a live build; not confirmed in later source material either.
- `c831b82` and `900238c` (both merged directly to `main`, no PR body in the export, no SDD artifacts) are real production-hardening changes not captured by any archived SDD change — see the reconstruction report.
