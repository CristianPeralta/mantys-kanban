# Design: Human-readable project slug in board URL (issue #50)

Reconstructed from Engram observation id 443.

## Technical Approach

Slug is a routing-only concern. Add `slug String @unique` to `Project`. Generate it in `ProjectsService` (not in DTO/controller) so create + rename share one code path. Tasks stay CUID-filtered: the web layer always resolves slug → project (CUID) first, then fetches `/tasks?projectId=<cuid>`. No cascading refactor. Backfill runs inside the migration BEFORE the unique constraint is applied.

## Architecture Decisions

| Decision | Choice | Rejected alternative | Rationale |
|---|---|---|---|
| Where slug is generated | Service layer (`projects.service.ts`) | DTO transform / controller | Create AND rename need it; service already owns Prisma. Keeps DTO a pure validation shape. |
| Slug lib | Inline pure-JS `slugify()` | `slugify` npm pkg | No new dep needed; requirement is trivial (ascii lowercase + hyphen). |
| Collision resolution | DB query for base + `^base(-\d+)?$`, append next free `-N` | App-level random suffix / DB retry-on-P2002 loop | Deterministic, readable slugs; one extra query is cheap at this scale. |
| Route ordering | Declare `GET /projects/by-slug/:slug` BEFORE `@Get(':id')` | Put after `:id` | NestJS matches top-down; `:id` would otherwise capture `by-slug`. Literal prefix also disambiguates. |
| Tasks keyed by | CUID (unchanged) | Slug-based task filtering | Avoids touching task contract; slug is presentation only. |
| Backfill dedup | `ROW_NUMBER()` window in migration SQL | Plain `UPDATE name->slug` | Two existing projects with the same name would slugify equally and violate the unique constraint. |
| Rename old-slug links | Not handled (404) | Redirect table | Out of scope per proposal (MVP). |

## Data Flow

```
Create/Rename: Controller -> Service.generateUniqueSlug(name) -> [query existing slugs] -> prisma.create/update({...dto, slug}) -> returns project incl. slug.

Navigate: /board/<slug> page -> GET /projects/by-slug/:slug -> {id, slug,...} -> GET /tasks?projectId=<id> -> render.

Legacy: /board?projectId=<cuid> -> GET /projects/:id -> read slug -> redirect(/board/<slug>).
```

## Slug Algorithm (pure JS, in service)

```ts
function slugify(name: string): string {
  return name
    .normalize('NFKD').replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')   // non-alnum -> hyphen
    .replace(/^-+|-+$/g, '')        // trim hyphens
    || 'project';                   // fallback if name had no alnum
}
```

Collision (async): `base = slugify(name)`. Query `findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })`. If `base` is free, use it. Else find the max numeric suffix among `^base-(\d+)$` and return `base-(max+1)` (first duplicate = `-2`). On rename, exclude the current project id so a project keeps its slug when the name is unchanged.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/prisma/schema.prisma` | Modify | Add `slug String @unique` to `Project` |
| `apps/api/prisma/migrations/20260614120000_add_project_slug/migration.sql` | Create | ADD COLUMN nullable → backfill via ROW_NUMBER → SET NOT NULL → CREATE UNIQUE INDEX |
| `apps/api/src/projects/projects.service.ts` | Modify | Add private `slugify`, async `generateUniqueSlug(name, excludeId?)`, `findBySlug(slug)`; inject slug in `create` + `update` |
| `apps/api/src/projects/projects.controller.ts` | Modify | Add `@Get('by-slug/:slug')` BEFORE `@Get(':id')` |
| `apps/api/src/projects/projects.service.spec.ts` | Modify | Slug unit tests |
| `apps/api/src/projects/projects.controller.spec.ts` | Modify | `findBySlug` route delegates to service |
| `packages/types/src/index.ts` | Modify | Add `slug: string` to `Project` interface |
| `apps/web/src/app/board/[slug]/page.tsx` | Create | Resolve slug→project→tasks, render board |
| `apps/web/src/app/board/page.tsx` | Modify | If `?projectId=<cuid>`: fetch project, redirect to `/board/<slug>`; else keep all-projects view |
| `apps/web/src/components/board/Sidebar.tsx` | Modify | hrefs/router.push use `/board/<slug>`; active detection by slug; create-redirect uses `saved.slug` |

## Interfaces

- `GET /projects/by-slug/:slug` → `Project` (incl. `id`, `slug`) or 404.
- Service: `findBySlug(slug: string)`, `generateUniqueSlug(name: string, excludeId?: string): Promise<string>`.
- `Project` type/interface gains `slug: string`.

## Migration SQL (backfill ordering — critical)

```sql
ALTER TABLE "Project" ADD COLUMN "slug" TEXT;
UPDATE "Project" p SET "slug" =
  CASE WHEN s.rn = 1 THEN s.base ELSE s.base || '-' || s.rn END
FROM (
  SELECT id,
    NULLIF(regexp_replace(lower(unaccent(name)), '[^a-z0-9]+', '-', 'g'), '') AS base_raw,
    row_number() OVER (PARTITION BY <slugified name> ORDER BY "createdAt") AS rn
  FROM "Project"
) s WHERE p.id = s.id;
ALTER TABLE "Project" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
```

`unaccent` needs the Postgres extension; if unavailable, drop the accent-strip in SQL (the app handles it going forward via NFKD) or `CREATE EXTENSION IF NOT EXISTS unaccent`. Keep SQL slugify in sync with JS. Trim leading/trailing hyphens and fall back to id/`project` when the base is empty.

**As shipped**: the `unaccent` extension was NOT available/used — the actual migration (`20260614120000_add_project_slug`) does an ASCII-only backfill (no accent-stripping in SQL); the app handles accents via NFKD normalize for all rows created going forward.

## Testing Strategy (Strict TDD — API only; web has no runner)

| Layer | What | Approach |
|---|---|---|
| Unit (service) | `slugify`: spaces, uppercase, accents, special chars, leading/trailing hyphens, empty→fallback | Pure fn, no Prisma |
| Unit (service) | `generateUniqueSlug`: no collision returns base; one collision → `-2`; gaps → next free; rename excludes own id | Mock `findMany` returning existing slugs |
| Unit (service) | `create` injects slug into `prisma.create` data; `update` regenerates + returns new slug | Mock prisma |
| Unit (service) | `findBySlug` delegates to `findUnique({ where: { slug } })` | Mock prisma |
| Unit (controller) | `by-slug/:slug` calls `service.findBySlug` | Existing mock-service pattern |
| Manual/web | slug route render + legacy redirect | No runner; manual verify |

## Migration / Rollout

Single additive migration; down = drop column + index. CUIDs untouched; `?projectId=` path still works via redirect. No feature flag.

## Open Questions (as of design time)

- `unaccent` extension availability on the Netcup Postgres — resolved by NOT using it; ASCII-only backfill was accepted since JS handles accents for future rows.
