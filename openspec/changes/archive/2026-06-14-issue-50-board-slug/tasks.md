# Tasks: issue-50-board-slug — Human-readable project slug in board URL

Reconstructed from Engram observations id 444 (task plan) and id 447 (apply-progress). All tasks complete.

**Delivery**: single PR (~280-360 changed lines, Medium 400-line-budget risk, `size-exception`).

## Phase 1: Foundation — Prisma Schema + Migration
- [x] 1.1 `apps/api/prisma/schema.prisma` — add `slug String @unique` to `Project`
- [x] 1.2 Create migration `apps/api/prisma/migrations/20260614120000_add_project_slug/migration.sql` — 4-step SQL: ADD COLUMN nullable → UPDATE with ROW_NUMBER dedup backfill (ASCII-only, no `unaccent` extension) → SET NOT NULL → CREATE UNIQUE INDEX
- [x] 1.3 `npx prisma generate` — client regenerated, includes `slug`

## Phase 2: API — Service Layer (Strict TDD: RED → GREEN → REFACTOR)
- [x] 2.1 [RED] Failing unit tests for `slugify()` — spaces/uppercase, accents (NFKD), special chars, hyphen trimming, empty→`'project'` fallback
- [x] 2.2 [RED] Failing unit tests for `generateUniqueSlug(name, excludeId?)` — no collision, `-2`, `-3`, rename excludes own id, rename with collision
- [x] 2.3 [RED] Failing unit tests for `findBySlug(slug)` — found / NotFoundException on unknown
- [x] 2.4 [GREEN] Implemented in `projects.service.ts`: private `slugify()`, `generateUniqueSlug()`, `findBySlug()`; `create()` injects slug, `update()` regenerates with `excludeId`
- [x] 2.5 [REFACTOR] Extracted `computeNextSuffix()` helper; all 23 service tests pass

## Phase 3: API — Controller + Controller Tests (Strict TDD)
- [x] 3.1 [RED] Failing unit test: `GET /projects/by-slug/:slug` calls `service.findBySlug`
- [x] 3.2 [GREEN] Added `@Get('by-slug/:slug')` BEFORE `@Get(':id')` in `projects.controller.ts`
- [x] 3.3 [REFACTOR] Confirmed route order in source; JSDoc added

## Phase 4: Shared Types
- [x] 4.1 `packages/types/src/index.ts` — added `slug: string` to `Project` interface

## Phase 5: Frontend — New Slug Route
- [x] 5.1 Created `apps/web/src/app/board/[slug]/page.tsx` — resolves slug → project via `GET /projects/by-slug/:slug`, `notFound()` on 404, fetches tasks by CUID
- [x] 5.2 Modified `apps/web/src/app/board/page.tsx` — legacy `?projectId=` redirect (see verify-report note on 307→301/permanentRedirect fix)
- [x] 5.3 Modified `apps/web/src/components/board/Sidebar.tsx` — slug hrefs, `usePathname`-based active detection (prop renamed `activeProjectId` → `activeProjectSlug`), `router.push('/board/' + saved.slug)` on save, delete-comparison by slug

## Additional Fix (found during apply)
- [x] `apps/api/test/tasks.e2e-spec.ts` — added `slug: 'test-project'` to the e2e fixture's `prisma.project.create` call (TypeScript required it after the schema change)

## Test Results
- API unit tests: 80/80 pass (8 suites)
- Web TypeScript: clean (`npx tsc --noEmit`)
- API TypeScript: clean

## Commits
1. `feat(db): add slug field to Project model with backfill migration`
2. `feat(api): add slug generation, findBySlug endpoint, and TDD coverage`
3. `feat(types): add slug field to Project interface`
4. `feat(web): add /board/[slug] route, legacy redirect, and slug-based sidebar links`

Branch: `feat/issue-50-board-slug` → **PR #51** → merged to `main`.

## Deviations from Design
None at apply time — implementation matched design exactly. (The 307-vs-301 redirect issue was caught at verify time, not apply time — see verify-report.md.)
