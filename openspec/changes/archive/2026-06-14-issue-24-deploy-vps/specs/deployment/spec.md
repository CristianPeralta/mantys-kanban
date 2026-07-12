# deployment — Delta Spec (change: issue-24-deploy-vps)

Reconstructed from Engram observation id 387. Covers three new capabilities: `container-build`, `continuous-deployment`, `prisma-migration-on-deploy`.

## ADDED Requirements

### Requirement: API Multi-Stage Dockerfile

The API Dockerfile MUST use a two-stage build (`builder` + `runner`). The runner stage MUST copy `node_modules/.prisma/client` from the builder stage. The runner stage MUST have `package-lock.json` available for deterministic installs. The API MUST default `PORT` to `3000` (not `3002`).

#### Scenario: API image builds and serves on port 3000

- GIVEN a clean Docker build context for `apps/api`
- WHEN the image is built and a container is started without an explicit `PORT` env var
- THEN the server listens on port 3000
- AND the Prisma client resolves without a `generate` call at runtime

#### Scenario: Prisma client missing from runner

- GIVEN the runner stage does NOT copy `node_modules/.prisma/client` from builder
- WHEN the container starts
- THEN the process exits with a non-zero code referencing missing Prisma client

### Requirement: Web Multi-Stage Dockerfile

The web Dockerfile MUST accept `NEXT_PUBLIC_API_URL` as a build ARG and bake it into the image at `next build` time. The Dockerfile MUST use Next.js standalone output (`/app/.next/standalone`) as the runtime artifact.

#### Scenario: Web image built with production API URL

- GIVEN `NEXT_PUBLIC_API_URL=https://api.mantys.studio` is passed as a build ARG
- WHEN the image is built and the container starts
- THEN the web app makes API calls to `https://api.mantys.studio`

### Requirement: Next.js Standalone Output

`apps/web/next.config.mjs` MUST declare `output: 'standalone'`.

#### Scenario: Standalone output is active

- GIVEN `output: 'standalone'` is set in `next.config.mjs`
- WHEN `next build` runs
- THEN `.next/standalone` directory is created and contains a self-contained server entry point

> Note: the exact path of the emitted `server.js` inside an npm-workspace standalone build (`apps/web/server.js` vs a root `server.js`) was flagged as unverified at verify time (see verify-report W1) — it could not be confirmed without a live build in the monorepo context.

### Requirement: docker-compose.yml Configuration

`docker-compose.yml` MUST include a `web` service on port 3001. It MUST pass `PORT`, `WEB_URL`, and `NEXT_PUBLIC_API_URL` to their respective services. It MUST NOT publish postgres port 5432 to the host.

#### Scenario: Postgres not publicly reachable

- GIVEN `docker-compose.yml` has no `ports` mapping for the postgres service
- WHEN containers start
- THEN `nc -zv localhost 5432` from the host fails
- AND the api container can still connect to postgres via the internal network

#### Scenario: Web service accessible on port 3001

- GIVEN the compose file maps `3001:3001` for the `web` service
- WHEN `docker compose up` runs
- THEN `curl http://localhost:3001` returns a 200 response from the web app

### Requirement: Environment Variables Documentation

`.env.example` MUST exist at the repo root and document all required variables: `DATABASE_URL`, `JWT_SECRET`, `WEB_URL`, `PORT`, `NEXT_PUBLIC_API_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.

### Requirement: CD Workflow Trigger

`.github/workflows/deploy.yml` MUST trigger on push to `main`. The workflow SHOULD run after the existing test suite passes.

> Note: as shipped, the workflow does NOT have a `needs:`/`workflow_run` dependency on the CI workflow — it relies on branch protection requiring CI to pass before merge to main instead. This is a documented SHOULD-level gap (verify-report S1), not a MUST-level failure.

#### Scenario: Push to main fires the deploy workflow

- GIVEN a commit is pushed to the `main` branch
- WHEN GitHub Actions evaluates workflows
- THEN the deploy workflow is triggered

### Requirement: GHCR Image Push — API and Web

The workflow MUST build and push the API image to `ghcr.io/cristianperalta/mantys-kanban/api:latest` (and `:{sha}`), and the web image (with build ARG `NEXT_PUBLIC_API_URL=https://api.mantys.studio`) to `ghcr.io/cristianperalta/mantys-kanban/web:latest` (and `:{sha}`).

### Requirement: SSH Deploy Step

The workflow MUST SSH into the VPS and run `docker compose -f docker-compose.yml -f docker-compose.prod.yml pull && ... up -d --remove-orphans`. Required secrets are `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, and `GHCR_TOKEN`.

> Note: as of archive, these four secrets had NOT yet been added to the GitHub repo, so the deploy job was defined but never executed end-to-end — see the reconstruction report gap.

### Requirement: docker-compose.prod.yml

`docker-compose.prod.yml` MUST reference GHCR images for api and web (no `build:` context for api). It MUST set `restart: unless-stopped` for the api and web services. It MUST NOT expose postgres port 5432 to the host. It MUST be used layered on top of the base file: `docker compose -f docker-compose.yml -f docker-compose.prod.yml`.

### Requirement: Automatic Migration on Container Start

The API container MUST run `npx prisma migrate deploy` as part of its Docker entrypoint, before the NestJS server process starts. The migration MUST NOT run as a separate init container or sidecar.

#### Scenario: Migration succeeds — server starts

- GIVEN a valid `DATABASE_URL` is set and pending migrations exist
- WHEN the API container starts
- THEN `prisma migrate deploy` runs first
- AND once it exits 0, the NestJS server starts on the configured PORT

#### Scenario: Migration fails — container does not start server

- GIVEN `DATABASE_URL` points to an unreachable database
- WHEN the API container starts
- THEN `prisma migrate deploy` exits with a non-zero code
- AND the NestJS server process is NOT started
- AND the container exits with the same non-zero code
