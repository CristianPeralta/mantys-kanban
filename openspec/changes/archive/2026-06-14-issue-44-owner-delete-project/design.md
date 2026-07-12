# Design: Restrict Project Deletion to OWNER Role (issue #44)

Reconstructed from Engram observation id 313.

## Executive Summary

Enforce OWNER-only project deletion server-side via an inline role check on the guarded DELETE endpoint, and route the UI delete through a new Next.js server action so the httpOnly JWT cookie is attached. Reuse the existing `Role` enum from `@mantys/types`; thread `role` through `BoardPage → Sidebar → ProjectModal` and widen `KanbanBoard.currentUser`.

## Architecture Approach

- Pattern: controller-inline authorization (NOT a generalized RolesGuard) — single gated endpoint today; defer abstraction until a 2nd appears.
- Layering: security gate lives ONLY in the API. UI hiding is cosmetic UX, never a control.
- Boundary: the browser cannot read the httpOnly `auth-token` cookie, so the authenticated DELETE MUST cross the server boundary via a Next.js server action (same pattern as `loginAction`/`logoutAction` in `apps/web/src/app/actions/auth.ts`).

## Key Discovery: Component Topology

In `apps/web/src/app/board/page.tsx`, `<Sidebar>` and `<KanbanBoard>` are SIBLINGS, not parent/child. The project delete UI lives entirely inside `Sidebar → ProjectModal`. So:
- The real prop chain for gating the delete button: `BoardPage → Sidebar` (new `currentUserRole` prop) `→ ProjectModal` (new `currentUserRole` prop).
- `KanbanBoard.currentUser` widening (add `role`) is a PARALLEL, lower-priority change for type correctness only — it does NOT carry the delete gate. `KanbanBoard` does not render `ProjectModal`.

## API Layer (`apps/api/src/projects/projects.controller.ts`)

```ts
@ApiOperation({ summary: 'Delete a project by ID' })
@ApiResponse({ status: 204, description: 'Project deleted' })
@ApiResponse({ status: 401, description: 'Missing or invalid token' })
@ApiResponse({ status: 403, description: 'Caller is not an OWNER' })
@ApiResponse({ status: 404, description: 'Project not found' })
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Delete(':id')
@HttpCode(204)
remove(@Param('id') id: string, @Req() req: any) {
  if (req.user?.role !== 'OWNER') {
    throw new ForbiddenException('Only OWNER can delete a project');
  }
  return this.projectsService.remove(id);
}
```

`JwtAuthGuard` runs first (401 if token missing/invalid/expired). Role check runs inside the handler after the guard (403 for authenticated non-OWNER). `ProjectsService.remove()` stays role-agnostic; its P2025 → 404 mapping is preserved (only reachable post-authorization).

`JwtStrategy.validate` types role as `string` — the controller compares against the literal `'OWNER'` rather than importing `Role` from `@mantys/types`, keeping the controller free of a cross-package import.

## Server Action (`apps/web/src/app/actions/projects.ts` — NEW)

```ts
'use server'

import { cookies } from 'next/headers'

const COOKIE_NAME = 'auth-token'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002'

export type DeleteProjectResult = { ok: true } | { ok: false; error: string }

export async function deleteProjectAction(projectId: string): Promise<DeleteProjectResult> {
  const token = cookies().get(COOKIE_NAME)?.value
  if (!token) return { ok: false, error: 'Not authenticated' }

  try {
    const res = await fetch(`${API_URL}/projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (res.status === 403) return { ok: false, error: 'Only owners can delete projects' }
    if (res.status === 401) return { ok: false, error: 'Session expired. Please log in again.' }
    if (!res.ok) return { ok: false, error: 'Could not delete project. Try again.' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not delete project. Try again.' }
  }
}
```

Notes:
- Takes a plain `projectId: string` (not FormData) — invoked imperatively from the client `ProjectModal.handleDelete`, keeping the existing optimistic `onDelete(projectId)` callback flow intact.
- Returns a discriminated result instead of throwing, so the modal can render specific 403/401 messages.
- `API_URL` default `:3002` (matches `page.tsx`/`ProjectModal`, NOT the `:3000` default in `auth.ts` — a pre-existing inconsistency; real envs set `NEXT_PUBLIC_API_URL` so this only matters for local dev).
- DELETE returns 204 (no body); does NOT call `res.json()`.

## Frontend Prop Chain

- `BoardPage`: `currentUserRole = profile?.role`; passes `<Sidebar ... currentUserRole={profile?.role} />`. For `KanbanBoard` consistency (parallel change), includes `role: profile.role` in the `currentUser` object.
- `Sidebar`: `Props` gains `currentUserRole?: Role`; forwards to `<ProjectModal ... currentUserRole={currentUserRole} />`.
- `ProjectModal`: `Props` gains `currentUserRole?: Role`.

### ProjectModal changes

```ts
const canDelete = mode === 'edit' && currentUserRole === 'OWNER'
// ...
{canDelete && (
  <Button type="button" size="sm" onClick={() => setConfirmDelete(true)} ...>Delete</Button>
)}
```

```ts
import { deleteProjectAction } from '@/app/actions/projects'

async function handleDelete() {
  if (!project) return
  setLoading(true)
  setError(null)
  const result = await deleteProjectAction(project.id)
  if (result.ok) {
    onDelete?.(project.id)
  } else {
    setError(result.error)
    setLoading(false)
  }
}
```

## Type Changes Summary

- `KanbanBoard.currentUser`: widen from `{ name?: string; email?: string } | null` to `{ name?: string; email?: string; role?: Role } | null` (parallel consistency; unused by KanbanBoard logic today).
- `Sidebar.Props` / `ProjectModal.Props`: add `currentUserRole?: Role`.
- No `packages/types` change — `Role` reused.

## Test-Fixture Fix

`apps/api/src/users/users.service.spec.ts:106` — `role: 'ADMIN'` → `role: 'MEMBER'` (`Role` only has `OWNER`/`MEMBER`; the value was a raw string literal, not `Role.ADMIN`).

## ADR-style Decisions

| ADR | Decision | Rejected | Rationale |
|-----|----------|----------|-----------|
| ADR-1 | Inline controller role check | `RolesGuard` + `@Roles()` decorator | One gated endpoint; matches existing `AuthController` style; zero new abstractions. Revisit at 2nd role-gated endpoint |
| ADR-2 | Next.js server action for delete | Client `fetch` with credentials/cookies; route-handler proxy | JWT is httpOnly and API reads a Bearer header, not a cookie — forwarding cookies cross-origin wouldn't authenticate anyway; server action is less boilerplate than a proxy |
| ADR-3 | Prop-drill `currentUserRole` (depth 1, `Sidebar → ProjectModal`) | React context/auth provider | Shallow chain; context unjustified for a single boolean gate |
| ADR-4 | Discriminated `{ ok }` return shape | Throwing exceptions | Lets the modal render distinct 403/401/network messages; avoids unhandled rejections in client |

## Risks / Assumptions

- Guard must ship in the SAME PR as the server action, else OWNER deletes break (401). Single-PR delivery enforced.
- `role` is a global user attribute (OWNER/MEMBER), not per-project ownership — matches the current model.
- `req: any` typing follows the existing `AuthController.profile` convention; no shared request-user type introduced.
