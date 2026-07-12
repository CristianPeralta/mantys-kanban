# web-app

Current-state spec, synthesized from `openspec/changes/archive/2026-06-14-issue-20-web-scaffold/`. Pure infrastructure/scaffolding — no product behavior beyond structure.

## Purpose

The Next.js 14 foundation (`apps/web`) that all frontend features (login, board, task UI) are built on.

## Requirements

### Requirement: App Structure

`apps/web` MUST use Next.js 14 App Router with TypeScript and a `src/` directory layout. The path alias `@/*` MUST resolve to `apps/web/src/*`. TailwindCSS v3 (stable, not the v4 canary) MUST be configured with `tailwindcss-animate`.

### Requirement: Dev/Build/Test Scripts

Root `package.json` MUST provide `dev:web`, `build:web`, `test:web` (each `npm run <script> --workspace=apps/web`). The web dev server runs on port `3001` (`next dev -p 3001`) — port `3000` is reserved for the API. `apps/web`'s own `test` script is currently a no-op stub (`echo "no web tests yet" && exit 0`) — there is no frontend test runner as of the latest archived change.

### Requirement: shadcn/ui Components

`Button`, `Card`, `Badge`, `Dialog`, `Avatar` MUST be importable from `@/components/ui/*` (CVA + Radix UI primitives, hand-written rather than scaffolded via the interactive `shadcn-ui` CLI, which is unsafe for non-interactive agents).

### Requirement: @mantys/types Integration

The web app MUST import shared types from `@mantys/types` without requiring a pre-built `dist/`. `next.config.ts`/`.mjs` MUST include `transpilePackages: ['@mantys/types']`, and `packages/types/package.json` MUST point `main`/`types`/`exports` at `src/index.ts` rather than a `dist/` build output.

### Requirement: API Client

`apps/web/src/lib/api.ts` MUST export a named axios instance (`export const api`) with `baseURL` from `process.env.NEXT_PUBLIC_API_URL` (documented in `.env.local.example`, falling back to `http://localhost:3000`).

### Requirement: Root Redirect

`apps/web/src/app/page.tsx` redirects `/` — to `/login` when scaffolded (superseded: as of `issue-21-web-auth`, edge middleware handles the auth-state redirect and root now points to `/board`; see `web-auth`).

## Known Limitation

There is still no frontend test runner (`test:web` is a no-op stub). Pure helper functions introduced in later changes (e.g. `getInitials`, `formatDeadline` in the Kanban board) were deliberately extracted to be unit-testable once a runner is added, but none exists yet as of the latest archived change.
