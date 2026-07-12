# Design: Web App Scaffold (apps/web)

Reconstructed from Engram observation id 224.

## Technical Approach

Manually scaffold Next.js 14 (App Router, `src/`, `@/*` alias) in `apps/web/` — NO interactive CLI (`create-next-app`/`shadcn-ui` are interactive, unsafe for sub-agents). All files written by hand. Tailwind v3 + manual shadcn/ui CVA+Radix components. `@mantys/types` consumed from source via `transpilePackages`. Root `page.tsx` does a static `redirect('/login')` (real session check is issue #21).

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Scaffold method | Hand-write all files | `create-next-app`/`shadcn` CLI | CLIs are interactive/non-deterministic; sub-agent needs reproducible files |
| `@mantys/types` resolution | Set `main`/`types`/`exports` → `src/index.ts` + `transpilePackages` | Build `dist/` in CI | Avoids a build step; Next compiles TS source directly. Prior `main: dist/index.js` was broken (no dist existed) |
| Auth gate | Static `redirect('/login')` in `page.tsx` | `middleware.ts` cookie check | Scaffold needs only "index → /login"; real JWT/session is #21 |
| Tailwind version | v3 + `tailwindcss-animate` | v4 canary | Stable shadcn compat |
| Port | `3001` (API owns 3000) | — | Avoids collision |
| Config format | `next.config.ts` / `tailwind.config.ts` (TS) | `.js` | Repo is TS-first; Next 14 supports TS config |

## File Changes

| File | Action |
|---|---|
| `apps/web/package.json` | Create — name `@mantys/web`, deps + scripts |
| `apps/web/tsconfig.json` | Create — extends Next preset, `@/*` paths |
| `apps/web/next.config.ts` | Create — `transpilePackages: ['@mantys/types']` |
| `apps/web/tailwind.config.ts` | Create — content glob + shadcn theme vars |
| `apps/web/postcss.config.js` | Create — tailwind + autoprefixer |
| `apps/web/.eslintrc.json` | Create — `next/core-web-vitals` |
| `apps/web/.env.local` + `.env.local.example` | Create — `NEXT_PUBLIC_API_URL=http://localhost:3000` |
| `apps/web/src/app/{layout,page}.tsx`, `globals.css` | Create |
| `apps/web/src/lib/{utils,api}.ts` | Create — `cn()` + axios instance |
| `apps/web/src/components/ui/{button,card,badge,dialog,avatar}.tsx` | Create — shadcn CVA/Radix |
| `package.json` (root) | Modify — add `dev:web`/`build:web`/`test:web` |
| `packages/types/package.json` | Modify — point main/types to `src`, add `exports` |
| `.gitignore` (root) | Modify — add `apps/web/.next/`, `apps/web/node_modules/` |

## Key Snippets

```ts
// apps/web/next.config.ts
import type { NextConfig } from 'next'
const nextConfig: NextConfig = { transpilePackages: ['@mantys/types'] }
export default nextConfig
```

```ts
// apps/web/src/lib/api.ts
import axios from 'axios'
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
})
```

```tsx
// apps/web/src/app/page.tsx
import { redirect } from 'next/navigation'
export default function Home() { redirect('/login') }
```

```json
// packages/types/package.json (resolution fix)
{
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "build": "tsc" }
}
```

shadcn/ui components (`button.tsx`, `card.tsx`, `badge.tsx`, `dialog.tsx`, `avatar.tsx`) follow the standard CVA + Radix primitive pattern with a `cn()` helper (`clsx` + `tailwind-merge`).

## Data Flow

```
Browser (:3001) ──→ Next App Router (apps/web)
     │                    │
     │              page.tsx redirect('/login')
     │                    │
lib/api.ts (axios) ──→ NEXT_PUBLIC_API_URL → API (:3000)   [configured, not called this slice]

@mantys/types ──(transpilePackages, from src/index.ts)──→ Next compiler
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Build smoke | `npm run build:web` compiles, types resolve | Primary acceptance gate |
| Dev smoke | `npm run dev:web` serves `:3001` | Manual |
| Type resolution | Importing a type from `@mantys/types` compiles | Build |
| Unit | None this slice — `test` script is a no-op stub | `test:web` exits 0 |

## Migration / Rollout

No migration. Fully additive + isolated. Rollback: delete `apps/web/`, revert root `package.json`/`.gitignore`, revert `packages/types/package.json` main/types/exports.

## Open Questions / Risks (as of design time)

- Whether `apps/api` imports `@mantys/types` expecting `dist/` — resolved during apply: `apps/api` does not import from `@mantys/types` at runtime (types are mirrored locally there), so the `main`→`src` change was safe. Confirmed by `npm run test:api` staying green (57/57).
