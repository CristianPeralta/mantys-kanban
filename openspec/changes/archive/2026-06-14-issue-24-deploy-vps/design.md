# Design: Deploy to Netcup VPS (api.mantys.studio + kanban.mantys.studio)

Reconstructed from Engram observation id 388.

## Technical Approach

Containerize both apps as multi-stage images, publish to GHCR on push to `main`, SSH-deploy on the VPS with `docker-compose.prod.yml`. Prisma migrations run via the API container entrypoint. nginx (host) terminates TLS and reverse-proxies to API (3000) and web (3001). `NEXT_PUBLIC_API_URL` is baked at web build time (Next.js constraint). First deploy is manual to validate infra; CD is enabled last.

## Architecture Decisions

### Decision: Prisma migrate via dedicated entrypoint script
**Choice**: `apps/api/entrypoint.sh` runs `prisma migrate deploy` then `node apps/api/dist/main`.
**Rejected**: inline `CMD sh -c "..."` (unreadable, no `set -e`); separate compose migration job.
**Rationale**: A script is testable and keeps the Dockerfile CMD declarative. **Critical gotcha**: `prisma` CLI is a devDependency by default, so `npm ci --omit=dev` in the runner removes it — `npx prisma` at runtime would need a network fetch (fragile). Fix: move `prisma` to `dependencies` in `apps/api/package.json` so `migrate deploy` is available without a network fetch; also copy the `prisma/` schema + migrations dir into the runner.

### Decision: Web standalone output, monorepo-aware copy
**Choice**: `output: 'standalone'`; copy `.next/standalone`, `.next/static`, `public`.
**Rationale**: Smallest runtime image, no dev deps. Must build `@mantys/types` before `next build`. In an npm workspace, standalone MAY emit `server.js` under `apps/web/server.js` OR at the standalone root — this was left as an explicit open question (see verify-report W1).

### Decision: NEXT_PUBLIC_API_URL as build ARG, default localhost
**Choice**: `ARG NEXT_PUBLIC_API_URL=http://localhost:3002`; CI/compose override to `https://api.mantys.studio`.
**Rationale**: Baked at build time (Next.js hard constraint); safe local default, prod value injected by workflow + prod compose build args.

### Decision: GHCR image names lowercased
**Choice**: `ghcr.io/cristianperalta/mantys-kanban/api` and `/web` (GHCR requires lowercase owner/repo).

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/main.ts` | Modify | PORT default 3000 |
| `apps/api/package.json` | Modify | move `prisma` to dependencies |
| `apps/api/Dockerfile` | Modify | lockfile copy, `npm ci --omit=dev`, copy `.prisma`, schema, migrations, entrypoint |
| `apps/api/entrypoint.sh` | Create | migrate deploy + start |
| `apps/web/next.config.mjs` | Modify | `output: 'standalone'` |
| `apps/web/Dockerfile` | Create | deps→builder→runner standalone |
| `docker-compose.yml` | Modify | web service, drop pg port, PORT/WEB_URL/NEXT_PUBLIC_API_URL |
| `docker-compose.prod.yml` | Create | GHCR images, restart policy |
| `.env.example` | Create | document vars |
| `.github/workflows/deploy.yml` | Create | build+push GHCR, SSH deploy |

## apps/api/Dockerfile (as designed)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/
RUN npm ci
COPY packages/types ./packages/types
COPY apps/api ./apps/api
RUN npm run build --workspace=packages/types
RUN npm run build --workspace=apps/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
RUN npm ci --omit=dev
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY apps/api/entrypoint.sh ./apps/api/entrypoint.sh
RUN chmod +x ./apps/api/entrypoint.sh
EXPOSE 3000
CMD ["./apps/api/entrypoint.sh"]
```

With `prisma` moved to `dependencies`, `npm ci --omit=dev` keeps both `@prisma/client` and the `prisma` CLI in the runner, and `postinstall` (`prisma generate`) regenerates the client during install. The `.prisma` copy from builder is a safety net.

## apps/api/entrypoint.sh

```sh
#!/bin/sh
set -e
cd /app/apps/api
echo "[entrypoint] running prisma migrate deploy"
npx prisma migrate deploy
echo "[entrypoint] starting API"
exec node dist/main
```

`set -e` aborts on failed migration; `exec` makes node PID 1 for clean signal handling.

## apps/web/Dockerfile (as designed)

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/web/package.json ./apps/web/
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://localhost:3002
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY packages/types ./packages/types
COPY apps/web ./apps/web
RUN npm run build --workspace=packages/types
RUN npm run build --workspace=apps/web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3001
CMD ["node", "apps/web/server.js"]
```

Gotcha (unresolved as of archive): standalone in a workspace places `server.js` at `apps/web/server.js` with hoisted `node_modules` — this assumption was NOT verified against a live build. If the build emits `server.js` at the standalone root instead, the CMD must change to `node server.js`.

## docker-compose.yml (changes)

- Remove `ports: ['5432:5432']` from postgres (internal only).
- api: add `PORT: 3000`, `WEB_URL`, `NEXT_PUBLIC_API_URL` env vars; keep `ports: ['3000:3000']`.
- Add a `web` service (build context `apps/web/Dockerfile`, `NEXT_PUBLIC_API_URL` build arg, `ports: ['3001:3001']`, `depends_on: api`).

## docker-compose.prod.yml (as designed)

```yaml
version: '3.9'
services:
  api:
    image: ghcr.io/cristianperalta/mantys-kanban/api:latest
    restart: unless-stopped
  web:
    image: ghcr.io/cristianperalta/mantys-kanban/web:latest
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-https://api.mantys.studio}
    restart: unless-stopped
  postgres:
    restart: unless-stopped
```

Used as `docker compose -f docker-compose.yml -f docker-compose.prod.yml ...`. The design originally called for `build: !reset null` on the api service to explicitly disable local builds; this was dropped during apply because `!reset` is not universally supported by older docker compose versions — omitting it is safe because the `image:` key takes precedence over any base-file `build:` context at runtime (documented deviation).

## .env.example (as designed)

```env
POSTGRES_USER=mantys
POSTGRES_PASSWORD=change-me-strong-password
POSTGRES_DB=mantys_kanban

DATABASE_URL=postgresql://mantys:change-me-strong-password@postgres:5432/mantys_kanban
PORT=3000
JWT_SECRET=change-me-jwt-secret
WEB_URL=https://kanban.mantys.studio

NEXT_PUBLIC_API_URL=https://api.mantys.studio
```

## .github/workflows/deploy.yml (as designed)

Trigger: `on.push.branches: [main]`, `concurrency: { group: deploy-${{ github.ref }}, cancel-in-progress: true }`. Single `deploy` job: checkout → `docker/setup-buildx-action` → GHCR login (`GITHUB_TOKEN`) → `build-push-action` for API (`:latest` + `:{sha}`) → `build-push-action` for web with `--build-arg NEXT_PUBLIC_API_URL=https://api.mantys.studio` → `appleboy/ssh-action` running `docker login` (with `GHCR_TOKEN`), `docker compose -f docker-compose.yml -f docker-compose.prod.yml pull`, `... up -d --remove-orphans`, `docker image prune -f`.

`GITHUB_TOKEN` (same-repo, `packages: write`) pushes to GHCR from the runner; `GHCR_TOKEN` (a separate PAT with `read:packages`) is used on the VPS to pull. The workflow does not gate on the CI workflow passing first — it relies on branch protection instead (documented as verify-report suggestion S1).

## VPS Runbook (manual, in order)

1. `git clone git@github.com:CristianPeralta/mantys-kanban.git /home/cristo/mantys-kanban`
2. Create `/home/cristo/mantys-kanban/.env` from `.env.example` with strong prod secrets
3. DNS: A records `api.mantys.studio` and `kanban.mantys.studio` → `152.53.89.252`
4. nginx vhost `api.mantys.studio` → proxy `127.0.0.1:3000`; HTTP→HTTPS redirect
5. nginx vhost `kanban.mantys.studio` → proxy `127.0.0.1:3001`; HTTP→HTTPS redirect
6. `sudo certbot --nginx -d api.mantys.studio -d kanban.mantys.studio`
7. First deploy (manual validation): `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
8. Seed: `docker exec mantys-kanban-api-1 npx prisma db seed`
9. Verify: `curl -I https://api.mantys.studio/api`, `curl -I https://kanban.mantys.studio`, login end-to-end
10. Enable CD: add GitHub secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `GHCR_TOKEN`; push to main

## Open Questions (as of design/verify time)

- Confirm standalone `server.js` path in this npm workspace during a real build (`apps/web/server.js` vs root `server.js`) — STILL OPEN at archive.
- Confirm `!reset` support in the VPS-installed docker compose version — RESOLVED (omitted entirely).
