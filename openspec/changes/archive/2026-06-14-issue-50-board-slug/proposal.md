# Proposal: Human-readable project slug in board URL (issue #50)

Reconstructed from Engram observations (ids 440, 441), change `issue-50-board-slug`.

## Intent

Board URLs exposed the raw CUID (`/board?projectId=clz...`). These URLs are unreadable, unshareable, and leak internal IDs. Replace them with `/board/<slug>` so users get clean, memorable, shareable links (e.g. `kanban.mantys.studio/board/my-project`).

## Scope

### In Scope
- Add `slug String @unique` to `Project` model + Prisma migration with SQL backfill for existing rows.
- Slug generation on project create; regenerate on rename (collision-safe: `-2`, `-3` suffixes).
- New API endpoint `GET /projects/by-slug/:slug` returning the project (with CUID).
- New Next.js dynamic route `apps/web/src/app/board/[slug]/page.tsx` resolving slug → project → tasks.
- Legacy redirect: `board/page.tsx` detects `?projectId=<cuid>` and 301-redirects to `/board/<slug>`.
- Add `slug: string` to `Project` interface in `packages/types`.
- Update Sidebar hrefs / router.push / active detection to use slug.
- Unit tests for slug generation, collision, special chars.

### Out of Scope
- Old-slug redirects after rename (renamed slug 404s for old links — accepted for MVP).
- Multi-workspace / per-tenant slug uniqueness (app is single-workspace; global `@unique` suffices).
- User-editable custom slugs (auto-generated only).
- Changing the internal `/tasks?projectId=<cuid>` contract (stays CUID-based).

## Capabilities

### New Capabilities
- `project-slug`: slug generation, uniqueness, and slug-based project lookup (API + data model).

### Modified Capabilities
- `board-navigation`: board routing moves from `?projectId=<cuid>` query to `/board/<slug>` path segment, with legacy redirect.

## Approach (Approach A — `/board/[slug]` + legacy redirect, chosen over a query-param-only change or a combined `/:idOrSlug` endpoint)

1. **Data + migration**: Add `slug @unique`. Backfill existing rows INSIDE the migration via SQL `UPDATE` (slugified `name`) BEFORE applying the NOT NULL/unique constraint — never a bare `ADD COLUMN`.
2. **Slug as a routing concern only**: tasks keep filtering by CUID; frontend always resolves slug → CUID first, so no cascading refactor.
3. **Route ordering**: declare `GET /projects/by-slug/:slug` BEFORE `:id` (the `by-slug/` literal prefix also removes ambiguity).
4. **Pure slug util + collision loop**: simple inline `generateSlug(name)` (lowercase, dash-separate, trim) — no new npm dependency. Regenerate on rename and return new slug in the response.
5. **Backwards compat**: legacy `?projectId=` URLs resolve CUID → slug and 301-redirect.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| NOT NULL/unique on non-empty DB fails | High | Backfill via `UPDATE` inside migration before constraint |
| `by-slug` route swallowed by `:id` | Med | Declare `by-slug/:slug` before `:id`; literal prefix avoids collision |
| Rename produces dead URLs | Med | Accepted for MVP; no old-slug redirect |
| Slug collisions | Med | Collision loop with numeric suffix |

## Rollback Plan

Revert the PR. Migration is additive (`slug` column); a down-migration drops the column. No data loss — CUIDs untouched, `?projectId=` query path still works because the redirect is additive.

## Success Criteria

- [x] Creating a project yields a unique slug; URL is `/board/<slug>`.
- [x] `GET /projects/by-slug/:slug` returns the correct project.
- [x] Existing projects get backfilled slugs via migration.
- [x] Legacy `/board?projectId=<cuid>` 301-redirects to `/board/<slug>`.
- [x] Renaming regenerates slug and updates navigation.
