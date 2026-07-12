# web-app — Delta Spec (change: issue-20-web-scaffold)

Reconstructed from Engram observation id 223. Net-new infrastructure — all requirements are ADDED.

## ADDED Requirements

### Requirement: Dev Server

The system MUST serve the web app on port 3001 when `npm run dev:web` is run from the monorepo root. Root `package.json` MUST include `dev:web`, `build:web`, `test:web` scripts delegating to the `apps/web` workspace.

#### Scenario: Start web dev server

- GIVEN the monorepo root is the working directory
- WHEN the developer runs `npm run dev:web`
- THEN Next.js starts and listens on port 3001 with no startup errors

#### Scenario: Build web app

- GIVEN `apps/web/` is fully scaffolded
- WHEN the developer runs `npm run build:web`
- THEN the Next.js build completes with zero type errors and produces `.next/`

### Requirement: App Structure

The web app MUST reside at `apps/web/` using Next.js 14 App Router with TypeScript and a `src/` layout. The `@/*` alias MUST resolve to `apps/web/src/*`. TailwindCSS v3 (stable) + `tailwindcss-animate` MUST be configured.

#### Scenario: TypeScript resolves path alias

- GIVEN `apps/web/tsconfig.json` has `"@/*": ["./src/*"]`
- WHEN a component imports `'@/lib/api'`
- THEN TypeScript resolves it without error at compile time

### Requirement: shadcn/ui Components

Button, Card, Badge, Dialog, and Avatar MUST be installed and importable from `@/components/ui/`. No component import may fail at build time.

### Requirement: @mantys/types Integration

The web app MUST import types from `@mantys/types` without requiring a pre-built `dist/`. `next.config.ts` MUST set `transpilePackages: ['@mantys/types']`.

#### Scenario: No dist/ required

- GIVEN `packages/types/dist/` does not exist
- WHEN `npm run build:web` is run
- THEN the build succeeds (transpilePackages compiles from source)

### Requirement: API Client

`apps/web/src/lib/api.ts` MUST export an axios instance with `baseURL` read from `process.env.NEXT_PUBLIC_API_URL`. `.env.local` and `.env.local.example` MUST document `NEXT_PUBLIC_API_URL=http://localhost:3000`. The client MUST NOT make any real requests at scaffold time.

### Requirement: Auth Redirect

Unauthenticated requests to `/` MUST be redirected to `/login`. `/login` itself MUST NOT be redirect-looped.

> Note: the spec as originally written (obs #223) called for a `middleware.ts` that checks a JWT cookie and distinguishes authenticated vs. unauthenticated requests. As shipped, this was intentionally simplified to a static `redirect('/login')` in `page.tsx` (design decision, obs #224) — real session-aware routing was deferred to `issue-21-web-auth`. Flagged as verify-report warning W1: the static redirect applies to ALL visitors to `/`, authenticated or not, until issue-21 replaces it with real middleware. This spec reflects the actual shipped behavior of THIS change; see `openspec/changes/archive/2026-06-14-issue-21-web-auth/` for the real auth gate.

#### Scenario: GET / redirects to /login (scaffold behavior)

- GIVEN no session-aware middleware exists yet
- WHEN a browser navigates to `GET /`
- THEN the response redirects to `/login` (Next.js RSC redirect), regardless of auth state

#### Scenario: GET /login is not redirect-looped

- WHEN a browser navigates to `GET /login`
- THEN no redirect from `/` logic applies to this route

### Requirement: Monorepo Hygiene

Root `.gitignore` MUST include `apps/web/.next/`, `apps/web/node_modules/`, `apps/web/.env.local`, and `apps/web/next-env.d.ts`. `apps/web/` MUST have its own `.eslintrc.json` extending `next/core-web-vitals`. The root ESLint config and its `.ts`-only glob MUST NOT be modified to accommodate the web app — web owns its own linting via `next lint`.

## Non-Goals

- Login page UI (issue #21), Kanban board (issue #22), task management UI (issue #23)
- Real API calls (client exists, not wired to any component)
- Turborepo/Nx migration; any changes to `apps/api`
