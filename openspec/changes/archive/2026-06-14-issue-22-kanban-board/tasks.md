# Tasks: Kanban Board Main View (Issue #22)

Reconstructed from Engram observations id 261 (task plan) and id 263 (apply-progress). 14/14 automatable tasks complete; 1 manual task pending.

**Delivery**: single PR, `size:exception` (~480 changed lines across 10 files, High budget risk — exception granted).

## Phase 1: API — Service & Controller Changes (TDD)
- [x] 1.1 RED — `tasks.service.spec.ts`: assert `findAll` calls `findMany` with `{ where: {}, include: assigneeInclude }`
- [x] 1.2 RED — assert `findOne` calls `findUnique` with the same `include`
- [x] 1.3 RED — new `describe('findAll with projectId filter')`: assert `where: { projectId: 'proj-1' }`
- [x] 1.4 GREEN — `tasks.service.ts`: add `assigneeInclude`, `findAll(projectId?)` with conditional `where`, `findOne` with include — 12/12 GREEN
- [x] 1.5 RED — `tasks.controller.spec.ts`: `findAll(undefined)` and `findAll('proj-1')` forwarding assertions
- [x] 1.6 GREEN — `tasks.controller.ts`: add `@Query('projectId')`, forward to service — 23/23 GREEN

## Phase 2: Web — Dependencies
- [x] 2.1 `apps/web/package.json` — add `@dnd-kit/core ^6.1.0`, `@dnd-kit/sortable ^8.0.0`, `@dnd-kit/utilities ^3.2.2`; `npm install`

## Phase 3: Web — New Components
- [x] 3.1 `TaskCard.tsx` — `useSortable`; static `PRIORITY_STRIP`/`PRIORITY_CHIP` maps; `getInitials()`/`formatDeadline()` pure helpers
- [x] 3.2 `KanbanColumn.tsx` — `useDroppable({ id })`; `SortableContext`; static `COLUMN_STYLES` map; tinted header + count badge
- [x] 3.3 `Sidebar.tsx` — server component; `Link` nav with active highlight
- [x] 3.4 `KanbanBoard.tsx` — `useState(initialTasks)`; `PointerSensor` distance 8; `handleDragStart`/`handleDragEnd` (optimistic + rollback); `DragOverlay`; preserved header bar

## Phase 4: Web — Board Page Update
- [x] 4.1 `board/page.tsx` — async Server Component; sync `cookies()`/`searchParams`; `Promise.all` parallel fetch (`cache: 'no-store'`); renders `Sidebar` + `KanbanBoard`

## Phase 5: Verification
- [x] 5.1 API unit tests: 59/59 passing (57 existing + 2 new)
- [x] 5.2 `npx tsc --noEmit` on web: 0 errors
- [ ] 5.3 Manual smoke test (drag card across column, confirm persistence + rollback on simulated failure) — not automatable, pending browser QA

## Deviation from Design (documented in apply-progress)

None functionally — one addition not spelled out explicitly in the design: a `VALID_STATUSES` `Set` in `KanbanBoard.tsx`'s `handleDragEnd` to distinguish column droppable ids from task ids, since dnd-kit's `over.id` can be either.

## Post-verify addition (before archive)

Not in the original task list — added after `sdd-verify` flagged the missing error-indication requirement (verify-report suggestion 3): an absolute-positioned error banner in `KanbanBoard.tsx` (auto-dismisses after 3s) on `PUT` failure.
