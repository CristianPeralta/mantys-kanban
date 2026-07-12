# Tasks: Web App Scaffold (issue-20-web-scaffold)

Reconstructed from Engram observations id 225 (task plan) and id 227 (apply-progress). 26/26 tasks complete.

**Delivery**: single PR with `size:exception` (~550–650 changed lines, but all boilerplate/scaffold content — reviewer load is low despite line count).

## Phase 1: Monorepo Patches
- [x] 1.1 `packages/types/package.json` — `main`/`types` → `src/index.ts`, add `exports: { ".": "./src/index.ts" }`
- [x] 1.2 Root `package.json` — add `dev:web`, `build:web`, `test:web` scripts
- [x] 1.3 Root `.gitignore` — add `# web` section (`.next/`, `node_modules/`, `.env.local`, `next-env.d.ts`)

## Phase 2: Web App Config Files
- [x] 2.1 Create `apps/web/package.json` (`@mantys/web`, `next dev -p 3001`, all deps/devDeps)
- [x] 2.2 Create `apps/web/tsconfig.json` (`@/*` paths, `moduleResolution: bundler`)
- [x] 2.3 Create `apps/web/next.config.ts` (`transpilePackages: ['@mantys/types']`)
- [x] 2.4 Create `apps/web/tailwind.config.ts` (shadcn CSS vars, `tailwindcss-animate`)
- [x] 2.5 Create `apps/web/postcss.config.js`
- [x] 2.6 Create `apps/web/.eslintrc.json` (`next/core-web-vitals`)
- [x] 2.7 Create `apps/web/.env.local` (git-ignored)
- [x] 2.8 Create `apps/web/.env.local.example` (committed)

## Phase 3: Web App Source Files
- [x] 3.1 Create `apps/web/src/app/globals.css` (Tailwind + shadcn theme vars, light/dark)
- [x] 3.2 Create `apps/web/src/app/layout.tsx`
- [x] 3.3 Create `apps/web/src/app/page.tsx` (static `redirect('/login')`)
- [x] 3.4 Create `apps/web/src/lib/utils.ts` (`cn()`)
- [x] 3.5 Create `apps/web/src/lib/api.ts` (axios instance)

## Phase 4: shadcn/ui Components
- [x] 4.1 `button.tsx` — CVA variant/size, `asChild` via Radix Slot
- [x] 4.2 `card.tsx` — Card/CardHeader/CardTitle/CardDescription/CardContent/CardFooter
- [x] 4.3 `badge.tsx` — CVA variant
- [x] 4.4 `dialog.tsx` — Radix Dialog, animated overlay, X close
- [x] 4.5 `avatar.tsx` — Radix Avatar (Image + Fallback)

## Phase 5: Install and Verification
- [x] 5.1 `npm install` from root — required npm overrides for es-abstract 1.24.x transitive conflicts
- [x] 5.2 `npm run test:api` — 57/57 pass (types `main→src` change didn't break API)
- [x] 5.3 `npx tsc --noEmit` in `apps/web` — 0 errors
- [x] 5.4 `.next/` git-ignore verified
- [x] 5.5 Manual dev-server smoke — noted, not automated

## Deviations from Design
1. **npm overrides added** — design didn't anticipate the es-abstract 1.24.x transitive dep conflict; pinned `es-abstract@1.23.9`, `function.prototype.name@1.1.8`, `hasown@2.0.2`, `es-object-atoms@1.1.1` in root `package.json`. Monorepo maintenance, not a scaffold design change.
2. **`api.ts` uses named export** (`export const api`), matching the design exactly rather than a `default` export.
3. **`npm run build:web` not run** — `next build` needs env vars/possibly a DB; `npx tsc --noEmit` used as the smoke test instead (task-specified deviation).

## Commits
1. `aba154c` chore(monorepo): add web workspace scripts and patch @mantys/types resolution
2. `2e9e7b0` feat(web): scaffold Next.js 14 app with Tailwind, shadcn/ui components, and axios client
3. `b4e33e4` chore(deps): add npm overrides to fix transitive dependency version conflicts for apps/web
