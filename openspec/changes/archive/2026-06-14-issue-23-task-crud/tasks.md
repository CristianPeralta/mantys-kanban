# Tasks: issue-23-task-crud (GitHub issue #23)

Reconstructed from the ONLY Engram observation available for this change: `sdd/issue-23-task-crud/apply-progress` (id 271). No explore/proposal/spec/design/verify-report/archive-report observations exist for this change in the export — see the gap note in the reconstruction report. `tasks.md` is reconstructed directly from apply-progress content since it is the closest available artifact (a completed checklist).

**Branch**: `feat/issue-23-task-crud` → **PR #39** (`feat(board): task CRUD modals, filters toolbar, and real user avatar (#23)`) → merged to `main`.
**Mode**: Standard (web has no test infrastructure at this point in the project; strict TDD not applicable to the Next.js layer).
**Delivery**: single-pr. Estimated ~520 additions, ~24 deletions.

## Completed Tasks

- [x] Phase 1 — `TaskModal` component (`apps/web/src/components/board/TaskModal.tsx`)
- [x] Phase 2 — Filters toolbar in `KanbanBoard` (assignee + priority pills)
- [x] Phase 3 — Wire modals into `KanbanBoard`, update `KanbanColumn`, update `TaskCard`
- [x] Phase 4 — Update `board/page.tsx`: fetch users + `/auth/profile`, pass to `KanbanBoard`
- [x] Phase 5 — Verification: `tsc --noEmit` → 0 errors; API tests → 59/59 pass

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `apps/web/src/components/board/TaskModal.tsx` | Created | Unified create/edit modal with all fields, inline delete confirmation, optimistic API calls |
| `apps/web/src/components/board/KanbanBoard.tsx` | Modified | Added modal state, filter state (assignee/priority), user initials from `currentUser` prop, wired `TaskModal` |
| `apps/web/src/components/board/KanbanColumn.tsx` | Modified | Added "+ New task" button, `onAddTask` + `onEditTask` props |
| `apps/web/src/components/board/TaskCard.tsx` | Modified | Added `onClick` prop for edit-modal trigger |
| `apps/web/src/app/board/page.tsx` | Modified | Parallel fetch of tasks, projects, users, `/auth/profile`; passes users+currentUser to `KanbanBoard` |

## Deviations from Design (as recorded in apply-progress; no design doc survives)

- `GET /auth/profile` returns the JWT payload (`{ sub, email, role }`), not a full `User`. Resolved by cross-referencing `GET /users` via `sub === user.id`, falling back to `{ email }` if not found.
- No `select.tsx`/`textarea.tsx`/`input.tsx`/`label.tsx` primitives existed in `apps/web/src/components/ui/` yet — native HTML elements with Tailwind were used instead.
- TDD mode is active per project init, but `apps/web`'s `"test"` script was a no-op at this point — Standard mode used for this web-only change; API tests (59/59) verified unchanged.

## Commits

- `dc7479e` feat(web): add TaskModal component for create/edit/delete tasks
- `7141dbc` feat(web): wire task modals, filters toolbar, and real user avatar into board
- `78a5d9a` feat(web): fetch users and auth profile for board page props
