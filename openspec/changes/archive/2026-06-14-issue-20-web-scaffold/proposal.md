# Proposal: Web App Scaffold (apps/web)

Reconstructed from Engram observations (ids 219, 220), change `issue-20-web-scaffold` (GitHub issue #20).

## Intent

The monorepo had an API (`apps/api`) and shared types (`@mantys/types`) but no frontend. This change establishes the web app foundation so subsequent issues (#21 login, #22 board, #23 task UI) have a working Next.js shell with styling, UI primitives, an API client, and auth-gated routing. Pure infrastructure/scaffolding — unblocks all frontend work.

## Scope

### In Scope
- Scaffold Next.js 14 (App Router, TypeScript, `src/` dir, `@/*` alias) in `apps/web/`
- Configure TailwindCSS v3 + `tailwindcss-animate`
- shadcn/ui components: Button, Card, Badge, Dialog, Avatar
- API client: `apps/web/src/lib/api.ts` (axios, base URL from `NEXT_PUBLIC_API_URL`)
- Consume `@mantys/types` via `transpilePackages` (no pre-built `dist/`)
- Auth-gate: index redirects to `/login` when no session
- Root scripts: `dev:web`, `build:web`, `test:web`
- Web-local ESLint (`eslint-config-next`); `.gitignore` += `apps/web/.next/`

### Out of Scope
- Login page UI (#21), Kanban board (#22), task management UI (#23)
- Real API calls — client is configured, not used
- Turborepo/Nx migration; modifying `apps/api` build

## Approach

`create-next-app@14` + `shadcn-ui`-equivalent scaffold, but hand-written rather than run via CLI (interactive CLIs are unsafe for sub-agents — see design). Key decisions:
1. `@mantys/types`: `transpilePackages: ['@mantys/types']` in `next.config.ts` — compiles source, avoids needing `dist/`.
2. Port: `next dev -p 3001` (API owns 3000).
3. Env: `NEXT_PUBLIC_API_URL` (required prefix for client access).
4. Auth: index does a static `redirect('/login')` this slice; a real JWT/session gate is issue #21.
5. Tailwind v3 / shadcn stable — avoid v4 canary.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `@mantys/types` import fails (no `dist/`) | Med | `transpilePackages` + point `main`/`exports` at `src/index.ts` |
| Root lint glob misses `.tsx` | Med | Web app owns its own `next lint`/`.eslintrc.json`; root glob left untouched on purpose |
| shadcn v4 canary mismatch | Low | Pin Tailwind v3 + shadcn stable patterns |

## Rollback Plan

Delete `apps/web/`, revert root `package.json`/`.gitignore`/`packages/types/package.json`. No DB, no API, no shared runtime touched — fully isolated revert.

## Success Criteria

- [x] `npm run dev:web` (or root `dev`) serves web on `:3001`
- [x] shadcn/ui components (Button, Card, Badge, Dialog, Avatar) render
- [x] `@mantys/types` imports resolve in web app
- [x] Index redirects to `/login` (static; real auth check deferred to #21)
- [~] `npm run build:web` succeeds — verified via `npx tsc --noEmit` instead of a full `next build` (see verify-report W2)
