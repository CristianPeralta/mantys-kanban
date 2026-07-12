# web-app — Delta Spec (change: issue-50-board-slug)

Reconstructed from Engram observation id 442 (domain: `board-navigation`, Modified Capability). This is the web-routing half of issue #50; the API/data-model half lives in `../project-management/spec.md`.

## MODIFIED Requirements

### Requirement: Board Page Route

The board page MUST be accessible at the path `/board/[slug]` where `[slug]` is the project's slug value. The page MUST resolve the slug to a project (via `GET /projects/by-slug/:slug`) to obtain the CUID, then fetch tasks using the existing CUID-based endpoint. If the slug does not resolve to a project, the page MUST render a 404 (not-found) state.

(Previously: the board page was only accessible via `/board?projectId=<cuid>` — a query-param-based route with no dynamic segment.)

#### Scenario: Valid slug route renders board

- GIVEN a project with `slug = "my-project"` exists
- WHEN a user navigates to `/board/my-project`
- THEN the board page loads and displays that project's tasks

#### Scenario: Invalid slug shows not-found

- GIVEN no project with `slug = "ghost"` exists
- WHEN a user navigates to `/board/ghost`
- THEN the page renders a not-found state (HTTP 404 or equivalent UI)

### Requirement: Legacy Query-Param Redirect

The legacy route `GET /board?projectId=<cuid>` MUST issue a permanent redirect to `/board/<slug>`, resolving the CUID to the project's current `slug` first. If the CUID does not resolve to a project, the redirect SHOULD fall through to a not-found state rather than redirect to an invalid slug.

(Previously: `/board?projectId=<cuid>` was the primary board route — no redirect existed.)

> Note: the initial implementation used Next.js `redirect()` (HTTP 307, temporary). The verify pass flagged this as a spec deviation (W1) — a legacy/SEO-facing redirect needs a permanent code — and it was corrected to `permanentRedirect()` (HTTP 308) before archive. This spec reflects the corrected, shipped behavior.

#### Scenario: Legacy URL is redirected

- GIVEN a project with `id = "clzabc"` and `slug = "my-project"` exists
- WHEN a user navigates to `/board?projectId=clzabc`
- THEN the browser is redirected with a permanent redirect to `/board/my-project`

#### Scenario: Unknown CUID does not redirect to bad slug

- GIVEN no project with `id = "clzXXX"` exists
- WHEN a user navigates to `/board?projectId=clzXXX`
- THEN the page renders a not-found state (no redirect to a broken URL)

### Requirement: Sidebar Navigation Uses Slug

The Sidebar component MUST link each project to `/board/<slug>` instead of `/board?projectId=<cuid>`. Active-state detection MUST compare the current URL path segment against the project's `slug`, not the CUID query parameter.

(Previously: Sidebar built hrefs as `/board?projectId=<cuid>` and detected active state via query-param match.)

#### Scenario: Sidebar link points to slug URL

- GIVEN a project with `slug = "my-project"` is rendered in the Sidebar
- WHEN the Sidebar renders
- THEN the project link href is `/board/my-project`

#### Scenario: Active state matches by slug

- GIVEN the current route is `/board/my-project`
- WHEN the Sidebar renders
- THEN the "my-project" entry is marked active and no other entry is

## Known Gaps (as of archive)

- No E2E/Playwright tests exist for the `/board/[slug]` web route (`apps/web` has no test runner at all as of this change).
