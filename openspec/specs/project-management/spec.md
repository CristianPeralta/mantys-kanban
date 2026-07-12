# project-management

Current-state spec, synthesized from `openspec/changes/archive/2026-06-14-prisma-schema/` (base CRUD), `2026-06-14-issue-44-owner-delete-project/` (delete authorization), and `2026-06-14-issue-50-board-slug/` (slug identity + routing).

> Gap: `issue-40-project-management` (GitHub #40, PR #41, merged to `main`) added the create/edit/delete project MODAL in the web sidebar. No SDD artifacts exist for this change in the Engram export, so its UI behavior is NOT captured here beyond what later changes (`issue-44`, `issue-50`) reference incidentally (e.g. `ProjectModal`). See the reconstruction report for details.

## Purpose

CRUD for the `Project` resource: creation, listing, lookup by id or slug, rename (regenerating slug), and role-gated deletion.

## Requirements

### Requirement: Project CRUD Module

`ProjectsModule` MUST provide a `ProjectsService` with create/findAll/findOne/update backed by `PrismaService`. `create()` requires `name`; `description` is optional. `findOne` on a missing id returns `null` (not an exception — the one CRUD method that differs from `TasksService`/`UsersService` convention).

### Requirement: DELETE Restricted to OWNER

`DELETE /projects/:id` MUST require authentication (`JwtAuthGuard`) and MUST return `403 Forbidden` when the caller's role is not `OWNER`. The check is an inline `if (req.user?.role !== 'OWNER') throw new ForbiddenException(...)` in `ProjectsController.remove()` — not a generalized `RolesGuard`, since this is the only role-gated endpoint in the codebase so far. `ProjectsService.remove()` itself is role-agnostic; the API is the authoritative security gate (the UI hiding the delete button for non-OWNERs is a courtesy, not the enforcement point).

Unauthenticated `DELETE /projects/:id` MUST return `401`. OWNER succeeds with `204`.

### Requirement: Slug Identity

Every Project MUST carry a unique, URL-safe `slug` (pattern `[a-z0-9]+(-[a-z0-9]+)*`), generated from `name` on create and regenerated on rename. Collisions are resolved with numeric suffixes (`-2`, `-3`, ...). Renaming does NOT preserve or redirect the old slug — a bookmarked URL for a renamed project 404s (accepted MVP tradeoff).

`GET /projects/by-slug/:slug` MUST return the full project (including its CUID `id`). This route MUST be registered before the generic `GET /projects/:id` route in the controller, or Nest's routing would treat `by-slug` as an `:id` value.

#### Scenario: Slug generation with collisions

- GIVEN a project with `slug = "my-project"` already exists
- WHEN a second project named "My Project" is created
- THEN its slug is `"my-project-2"`

### Requirement: Board URL Uses Slug

The web board route is `/board/[slug]` (see `kanban-board` domain). The legacy `/board?projectId=<cuid>` query-param route MUST issue a permanent redirect (`permanentRedirect()`, HTTP 308) to `/board/<slug>`, resolving the CUID to its current slug first. An unresolvable CUID falls through to a not-found state rather than redirecting to a broken URL. Sidebar navigation links and active-state detection use the slug, not the CUID.
