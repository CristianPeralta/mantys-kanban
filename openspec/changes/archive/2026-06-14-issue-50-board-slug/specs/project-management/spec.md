# project-management — Delta Spec (change: issue-50-board-slug)

Reconstructed from Engram observation id 442. Covers the new `project-slug` capability plus the `board-navigation` modifications (web routing), grouped here under `project-management` since both concern the Project resource and its identity/URL.

## ADDED Requirements

### Requirement: Slug Field on Project

Every Project record MUST carry a `slug` field that is non-null, unique across all projects, and URL-safe. The `slug` MUST conform to the pattern `[a-z0-9]+(-[a-z0-9]+)*`. The `packages/types` `Project` interface MUST include `slug: string`.

#### Scenario: New project has a slug

- GIVEN no project named "My Project" exists
- WHEN a project named "My Project" is created
- THEN the stored record has `slug = "my-project"`
- AND `GET /projects/:id` returns the project with `slug` in the response body

#### Scenario: Slug is unique across projects

- GIVEN a project with `slug = "my-project"` already exists
- WHEN a second project named "My Project" is created
- THEN the stored record has `slug = "my-project-2"`

#### Scenario: Third collision

- GIVEN projects with slugs `"my-project"` and `"my-project-2"` exist
- WHEN a third project named "My Project" is created
- THEN the stored record has `slug = "my-project-3"`

#### Scenario: Special characters are normalized

- GIVEN no project exists
- WHEN a project named "Hello, World! (2024)" is created
- THEN the slug is `"hello-world-2024"`

### Requirement: Slug Regeneration on Rename

When a project is renamed, the system MUST generate a new slug from the new name and update the stored `slug` field. The rename response MUST return the updated `slug`.

#### Scenario: Rename produces new slug

- GIVEN a project with `name = "Alpha"` and `slug = "alpha"` exists
- WHEN the project is renamed to "Beta Launch"
- THEN the stored `slug` becomes `"beta-launch"`
- AND the API response for the rename includes `"slug": "beta-launch"`

#### Scenario: Rename with collision

- GIVEN a project with `slug = "beta"` exists
- WHEN another project is renamed to "Beta"
- THEN the renamed project gets `slug = "beta-2"`

> Note: renaming does NOT preserve or redirect old slugs — a previously bookmarked `/board/<old-slug>` URL 404s after a rename. Explicitly accepted as MVP scope (Engram exploration obs #440).

### Requirement: Slug-based Project Lookup Endpoint

The system MUST expose `GET /projects/by-slug/:slug` that returns the full project resource (including CUID) for a given slug. This route MUST be registered in the controller BEFORE the generic `GET /projects/:id` route.

#### Scenario: Valid slug lookup

- GIVEN a project with `slug = "my-project"` exists
- WHEN `GET /projects/by-slug/my-project` is requested
- THEN the response is HTTP 200 with the project payload including `id` and `slug`

#### Scenario: Unknown slug

- GIVEN no project with `slug = "unknown"` exists
- WHEN `GET /projects/by-slug/unknown` is requested
- THEN the response is HTTP 404

#### Scenario: Slug route not shadowed by id route

- GIVEN the controller registers both `by-slug/:slug` and `:id`
- WHEN `GET /projects/by-slug/some-slug` is requested
- THEN the request is handled by the `by-slug` handler, not the `/:id` handler

### Requirement: Slug Backfill for Existing Rows

The Prisma migration MUST backfill `slug` for all pre-existing `Project` rows using a SQL `UPDATE` executed BEFORE the NOT NULL and UNIQUE constraints are applied.

#### Scenario: Migration on non-empty database

- GIVEN the database contains projects without a `slug` column
- WHEN the migration runs
- THEN every existing project receives a unique, non-null slug derived from its `name`
- AND the migration completes without constraint violation errors

## MODIFIED Requirements

### Requirement: Board Page Route

The board page MUST be accessible at the path `/board/[slug]` where `[slug]` is the project's slug value. The page MUST resolve the slug to a project (via `GET /projects/by-slug/:slug`) to obtain the CUID, then fetch tasks using the existing CUID-based endpoint. If the slug does not resolve to a project, the page MUST render a 404 (not-found) state.

(Previously: board page was only accessible via `/board?projectId=<cuid>` — a query-param-based route with no dynamic segment.)

#### Scenario: Valid slug route renders board

- GIVEN a project with `slug = "my-project"` exists
- WHEN a user navigates to `/board/my-project`
- THEN the board page loads and displays that project's tasks

#### Scenario: Invalid slug shows not-found

- GIVEN no project with `slug = "ghost"` exists
- WHEN a user navigates to `/board/ghost`
- THEN the page renders a not-found state (HTTP 404 or equivalent UI)

### Requirement: Legacy Query-Param Redirect

The legacy route `GET /board?projectId=<cuid>` MUST issue a permanent (301) redirect to `/board/<slug>`. The redirect MUST resolve the CUID to the project's current `slug` before redirecting. If the CUID does not resolve to a project, the redirect SHOULD fall through to a not-found state rather than redirect to an invalid slug.

(Previously: `/board?projectId=<cuid>` was the primary board route — no redirect existed.)

#### Scenario: Legacy URL is redirected

- GIVEN a project with `id = "clzabc"` and `slug = "my-project"` exists
- WHEN a user navigates to `/board?projectId=clzabc`
- THEN the browser is redirected with HTTP 301 to `/board/my-project`

#### Scenario: Unknown CUID does not redirect to bad slug

- GIVEN no project with `id = "clzXXX"` exists
- WHEN a user navigates to `/board?projectId=clzXXX`
- THEN the page renders a not-found state (no redirect to a broken URL)

> Note: the shipped implementation initially used Next.js `redirect()`, which emits HTTP 307 (temporary), not the spec-required 301. Verify-report flagged this as **W1**. It was fixed before archive by switching to `permanentRedirect()` from `next/navigation`, which correctly emits 308 (the permanent-redirect equivalent Next.js uses in place of 301). This spec reflects the corrected, shipped behavior.

### Requirement: Sidebar Navigation Uses Slug

The Sidebar component MUST link each project to `/board/<slug>` instead of `/board?projectId=<cuid>`. Active-state detection MUST compare the current URL path segment against the project's `slug`, not the CUID query parameter.

(Previously: Sidebar built hrefs as `/board?projectId=<cuid>` and detected active state via query param match.)

#### Scenario: Sidebar link points to slug URL

- GIVEN a project with `slug = "my-project"` is rendered in the Sidebar
- WHEN the Sidebar renders
- THEN the project link href is `/board/my-project`

#### Scenario: Active state matches by slug

- GIVEN the current route is `/board/my-project`
- WHEN the Sidebar renders
- THEN the "my-project" entry is marked active and no other entry is
