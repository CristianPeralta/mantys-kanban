# Tasks: Restrict Project Deletion to OWNER Role (issue #44)

Reconstructed from Engram observations id 314 (task plan) and id 318 (apply-progress). All implementation tasks complete.

**Delivery**: single PR, `feat/issue-44-owner-delete-project`. ~220–280 changed lines, Low risk. API guard + server action must land together (guard alone would 401 every OWNER).

## Phase 1: Foundation — Fixture Fix (TDD pre-condition)
- [x] 1.1 `apps/api/src/users/users.service.spec.ts:106` — `role: 'ADMIN'` → `role: 'MEMBER'`. Baseline confirmed green (15/15) before proceeding.

## Phase 2: API — TDD Controller Guard (Strict TDD)
- [x] 2.1 [RED] `apps/api/src/projects/projects.controller.spec.ts` (new) — test: `remove()` with `req.user.role = 'MEMBER'` MUST throw `ForbiddenException`
- [x] 2.2 [RED] test: `remove()` with `req.user.role = 'OWNER'` MUST call `projectsService.remove(id)` and return its value
- [x] 2.3 [GREEN] `projects.controller.ts` — add `@UseGuards(JwtAuthGuard)`, `@Req() req: any`, inline `if (req.user?.role !== 'OWNER') throw new ForbiddenException(...)`; imports `Req`/`UseGuards`/`ForbiddenException` (`@nestjs/common`), `JwtAuthGuard`, `ApiBearerAuth`
- [x] 2.4 [REFACTOR] Confirm `@HttpCode(204)` present; no behavior change

## Phase 3: Server Action (Web — Standard Mode)
- [x] 3.1 Create `apps/web/src/app/actions/projects.ts` — `'use server'`, `DeleteProjectResult` type, `deleteProjectAction(projectId)` reads `auth-token` cookie, calls `DELETE ${API_URL}/projects/${projectId}` with Bearer, handles 401/403/network, no `res.json()`

## Phase 4: Frontend Prop Chain (Web — Standard Mode)
- [x] 4.1 `board/page.tsx` — pass `currentUserRole={profile?.role}` to `<Sidebar>`; include `role: profile?.role` in `currentUser` object for `<KanbanBoard>`
- [x] 4.2 `Sidebar.tsx` — add `currentUserRole?: string` to Props; forward to `<ProjectModal>`
- [x] 4.3 `KanbanBoard.tsx` — widen `currentUser` type with `role?: string` (parallel consistency only)

## Phase 5: ProjectModal Wiring (Web — Standard Mode)
- [x] 5.1 `ProjectModal.tsx` — add `currentUserRole?: string` to Props
- [x] 5.2 `canDelete = mode === 'edit' && currentUserRole === 'OWNER'`; gate delete button render
- [x] 5.3 Replace client `fetch()` DELETE in `handleDelete` with `deleteProjectAction(project.id)`; `result.ok` → `onDelete?.(project.id)`, else `setError(result.error)`

## Phase 6: Verification
- [x] 6.1 `pnpm test` in `apps/api` — 61/61 PASS (both new controller tests + full suite)
- [ ] 6.2 Manual smoke: OWNER sees delete button, deletion succeeds (204) — manual-only
- [ ] 6.3 Manual smoke: MEMBER — delete button NOT in DOM — manual-only
- [ ] 6.4 Manual smoke: MEMBER calls `DELETE /projects/:id` directly (curl) → 403 — manual-only
- [x] 6.5 `rg 'Role\.ADMIN' users.service.spec.ts` — no matches

## Deviations from Design
None. Implementation matches design exactly (ADR-1 inline check, ADR-2 server action, ADR-3 prop-drilling depth-1, ADR-4 discriminated result).

## Files Changed (8 total)
| File | Action |
|------|--------|
| `apps/api/src/users/users.service.spec.ts` | Modified — fixture fix |
| `apps/api/src/projects/projects.controller.spec.ts` | Created — 2 unit tests |
| `apps/api/src/projects/projects.controller.ts` | Modified — guard + role check |
| `apps/web/src/app/actions/projects.ts` | Created — `deleteProjectAction` |
| `apps/web/src/app/board/page.tsx` | Modified — pass `currentUserRole` |
| `apps/web/src/components/board/Sidebar.tsx` | Modified — prop + forward |
| `apps/web/src/components/board/KanbanBoard.tsx` | Modified — widened `currentUser` type |
| `apps/web/src/components/board/ProjectModal.tsx` | Modified — gate + server action |
