# Proposal: Restrict Project Deletion to OWNER Role (issue #44)

Reconstructed from Engram observations (ids 310, 311), change `issue-44-owner-delete-project`.

## Intent

`DELETE /projects/:id` was fully public — no JWT, no role check — and the UI showed the delete button to every user. Any MEMBER (or unauthenticated caller hitting the API directly) could permanently destroy a project. Goal: only OWNERs can delete a project, enforced server-side, with the UI hiding the action from non-OWNERs.

## Scope

### In Scope
- API: apply `@UseGuards(JwtAuthGuard)` to `DELETE /projects/:id` and throw `ForbiddenException` (403) when `req.user.role !== 'OWNER'`.
- API: tests for OWNER-allowed and MEMBER-denied (403) delete.
- Frontend: thread `role` from `BoardPage` (`profile.role`) → `Sidebar` → `ProjectModal`; widen `KanbanBoard.currentUser` type to include `role`.
- Frontend: hide the delete button in `ProjectModal` when role is not `OWNER`.
- Frontend: move the delete mutation to a Next.js server action so the httpOnly `auth-token` cookie is attached server-side.
- Fix `Role.ADMIN` test-fixture typo in `users.service.spec.ts` (no such enum value — valid values are `OWNER | MEMBER`).

### Out of Scope
- Generalized `RolesGuard` + `@Roles()` decorator (single endpoint today; revisit at a 2nd role-gated endpoint).
- Role gating of other project endpoints (create/update/read).
- Ownership-per-project model (current role is global OWNER/MEMBER, not per-project).
- Role-management UI or promotion/demotion flows.

## Capabilities

### Modified Capabilities
- `project-management`: deletion now requires authenticated OWNER role; non-OWNER delete returns 403. UI surfaces the action only to OWNERs.

## Approach

**API (controller inline check)**: Guard `DELETE :id` with `JwtAuthGuard`; read `@Req() req.user.role`; throw `ForbiddenException` if not `OWNER`. `ProjectsService.remove()` stays role-agnostic. The security gate lives ONLY in the API — UI hiding is a UX courtesy, not a control.

**Frontend transport (server action)**: The delete cannot stay a client `fetch()` — it sends no `Authorization` header and the JWT is in an httpOnly cookie clients can't read. Add `apps/web/src/app/actions/projects.ts` with a `deleteProjectAction` that reads the cookie via `cookies()` and calls the API with the Bearer token, mirroring `loginAction`/`logoutAction`.

**Frontend UI (prop drilling)**: Depth is 2 levels (`BoardPage` → `Sidebar` → `ProjectModal`); a React context is premature.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Guard breaks delete for OWNERs (no auth header from client) | High | Ship the server action in the SAME PR; mandatory |
| UI hides button but API still callable | Med | API guard is the real gate; test the API independently |
| `Role.ADMIN` typo causes confusion mid-change | Low | Fix the fixture while in the file |
| MEMBER bookmarks/old client retries delete | Low | 403 from API guarantees denial regardless of client state |

## Rollback Plan

Single PR — revert the commit. API regains public DELETE, UI shows the button for all, delete reverts to client `fetch()`. No DB migration.

## Success Criteria

- [x] `DELETE /projects/:id` returns 403 for MEMBER, 204 for OWNER.
- [x] OWNER can still delete a project end-to-end through the UI (server action carries the cookie).
- [x] Delete button is not rendered for MEMBER users in `ProjectModal`.
- [x] No `Role.ADMIN` references remain in test fixtures.
- [x] API guard tested independently of the UI.
