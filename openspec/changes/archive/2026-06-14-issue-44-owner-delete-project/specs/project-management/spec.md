# project-management — Delta Spec (change: issue-44-owner-delete-project)

Reconstructed from Engram observation id 312 ("Project Management — Authorization Spec"). Authorization rules for project deletion; no prior authorization spec existed for this domain.

## MODIFIED Requirements

### Requirement: Project CRUD Module

The system MUST provide a `ProjectsModule` with a `ProjectsService` that supports create, findAll, findOne, update, and delete operations backed by `PrismaService`. `DELETE /projects/:id` MUST additionally require authentication and MUST restrict deletion to callers with role `OWNER`.

#### Scenario: Create project

- GIVEN a valid CreateProjectDto with `name`
- WHEN `POST /projects` is called
- THEN the project is persisted via `prisma.project.create` and the created record is returned

#### Scenario: List all projects

- GIVEN one or more projects exist
- WHEN `GET /projects` is called
- THEN all project records are returned

#### Scenario: Project not found returns 404

- GIVEN no project with the given id exists
- WHEN `GET /projects/:id` is called
- THEN a 404 Not Found response is returned

#### Scenario: DELETE endpoint MUST require authentication

- GIVEN no valid JWT is attached to the request (no auth cookie, no Authorization header)
- WHEN `DELETE /projects/:id` is called
- THEN the API returns HTTP 401 Unauthorized
- AND the project is NOT deleted

#### Scenario: OWNER deletes a project (happy path)

- GIVEN the caller is authenticated with role `OWNER`
- WHEN `DELETE /projects/:id` is called with a valid project ID
- THEN the API returns HTTP 204
- AND the project is permanently removed

#### Scenario: MEMBER is denied deletion

- GIVEN the caller is authenticated with role `MEMBER`
- WHEN `DELETE /projects/:id` is called
- THEN the API returns HTTP 403 Forbidden
- AND the project is NOT deleted

#### Scenario: API authorization is the authoritative security gate

- GIVEN the caller is authenticated with role `MEMBER`
- AND the MEMBER bypasses the UI (e.g., direct API call)
- WHEN `DELETE /projects/:id` is called
- THEN the API returns HTTP 403 Forbidden
- AND the project is NOT deleted

> Implementation note: the role check is an inline `if (req.user?.role !== 'OWNER') throw new ForbiddenException(...)` in `ProjectsController.remove()`, guarded by `@UseGuards(JwtAuthGuard)` — not a generalized `RolesGuard`/`@Roles()` decorator (deferred until a 2nd role-gated endpoint exists). `ProjectsService.remove()` itself stays role-agnostic; its P2025 → 404 mapping is only reachable post-authorization.

## ADDED Requirements

### Requirement: Delete mutation MUST use a server action for cookie transport

The frontend delete action MUST be executed via a Next.js server action so the httpOnly `auth-token` cookie is forwarded to the API server-side. Client-side `fetch()` without an explicit auth header MUST NOT be used for this mutation, because the API expects a Bearer token (via `ExtractJwt.fromAuthHeaderAsBearerToken`) and the browser cannot read an httpOnly cookie to set it.

#### Scenario: OWNER deletes via UI (end-to-end happy path)

- GIVEN the user is authenticated as OWNER with a valid `auth-token` httpOnly cookie
- WHEN the user triggers the delete action in `ProjectModal`
- THEN the server action reads the cookie and calls `DELETE /projects/:id` with the Bearer token
- AND the API returns 204
- AND the project is removed from the board without a 401

#### Scenario: Server action forwards cookie to API

- GIVEN the `auth-token` cookie exists in the browser (httpOnly, inaccessible to client JS)
- WHEN `deleteProjectAction(projectId)` is invoked
- THEN the action reads the cookie server-side via `cookies()`
- AND attaches it as `Authorization: Bearer <token>` in the API call
- AND returns a discriminated result `{ ok: true } | { ok: false; error: string }` (distinct messages for 401/403/network failure) rather than throwing

> `deleteProjectAction` is invoked imperatively (RPC-style) from the client `ProjectModal.handleDelete`, not via `<form action>` — Next 14+ App Router supports calling a `'use server'` action directly from a client component.

### Requirement: Delete button MUST be hidden for non-OWNER users

The delete button in `ProjectModal` MUST NOT render when the current user's role is not `OWNER`. The component MUST receive `role` (`currentUserRole`) as a prop from its parent chain. This is a UX courtesy only — see the authoritative-gate scenario above.

#### Scenario: MEMBER opens a project in edit mode

- GIVEN the current user has role `MEMBER`
- AND `ProjectModal` is opened in `mode === 'edit'`
- WHEN the modal renders
- THEN the delete button is NOT present in the DOM

#### Scenario: OWNER opens a project in edit mode

- GIVEN the current user has role `OWNER`
- AND `ProjectModal` is opened in `mode === 'edit'`
- WHEN the modal renders
- THEN the delete button IS present and interactive

### Requirement: Role MUST be propagated from BoardPage to ProjectModal

The `role` field from `profile` in `BoardPage` MUST be threaded through `Sidebar` to `ProjectModal`. Note: `Sidebar` and `KanbanBoard` are SIBLINGS in `board/page.tsx`, not parent/child — the real prop chain for the delete gate is `BoardPage → Sidebar (currentUserRole) → ProjectModal (currentUserRole)`. `KanbanBoard`'s `currentUser` type is separately widened to include `role` for type consistency, but `KanbanBoard` does not render `ProjectModal` and does not carry the delete gate.

#### Scenario: role reaches ProjectModal

- GIVEN `BoardPage` fetches `profile` containing `role: 'OWNER' | 'MEMBER'`
- WHEN the component tree renders (`BoardPage` → `Sidebar` → `ProjectModal`)
- THEN `ProjectModal` receives `currentUserRole` as a prop equal to the authenticated user's role

### Requirement: Role.ADMIN MUST NOT appear in test fixtures

`users.service.spec.ts` MUST NOT reference `Role.ADMIN`. The valid enum values are `OWNER` and `MEMBER` only.

#### Scenario: Test suite passes without Role.ADMIN references

- GIVEN `users.service.spec.ts` is updated (`role: 'ADMIN'` → `role: 'MEMBER'`)
- WHEN the test suite runs
- THEN no `Role.ADMIN` reference exists and the suite passes without enum errors
