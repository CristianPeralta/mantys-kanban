# kanban-board

Current-state spec, synthesized from `openspec/changes/archive/2026-06-14-issue-22-kanban-board/` (board mechanics) and `openspec/changes/archive/2026-06-14-issue-50-board-slug/` (routing — see `project-management` for the slug requirements themselves).

> Gap: `issue-23-task-crud` (task create/edit modal, filters toolbar, real user avatar) and `issue-40-project-management` (project create/edit/delete modal in the sidebar) both merged into `main` and touch this surface, but neither has a usable SDD spec source in the Engram export (issue-23 only has a bare apply-progress; issue-40 has none at all). Their UI additions are NOT formally spec'd here — see the reconstruction report.

## Purpose

The primary Kanban workspace: a 5-column board with drag-and-drop status changes and project filtering.

## Requirements

### Requirement: Board Route

The board is served at `/board/[slug]` (Next.js dynamic route; see `project-management` for slug resolution and the legacy `/board?projectId=` redirect).

### Requirement: Initial Data Load

`board/[slug]/page.tsx` is an async Server Component that reads the `auth-token` httpOnly cookie and fetches `/tasks?projectId=<resolved-id>` and `/projects` from the API in parallel (`Promise.all`, `cache: 'no-store'`) with a Bearer header, passing the results as initial props to the client `KanbanBoard`.

### Requirement: Project Sidebar

Lists all projects; selecting one filters the board to that project's tasks (via the API's `projectId` query param); "All projects" (or deselecting) shows all tasks. Links point to `/board/<slug>`; active-state highlighting matches the current slug.

### Requirement: Five Columns

Exactly 5 columns, fixed order: BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE, side by side, horizontally scrollable (`overflow-x-auto` + `min-w-max`) on narrow viewports. Each column header is tinted per status (static, purge-safe Tailwind literal-class `Record<TaskStatus, ...>` maps — never string-interpolated) and shows a task-count badge.

### Requirement: Task Card

Shows title, a colored left priority strip + priority chip (A=red/Urgente, B=orange/Alta, C=yellow/Media, D=green/Baja), assignee avatar (initials fallback, absent if unassigned), and formatted deadline (omitted if null).

### Requirement: Drag-and-Drop Status Change

Dragging a card to a different column moves it immediately (optimistic `useState` update, no React Query/SWR — explicit choice) and fires `PUT /tasks/:id { status: newStatus }`. On failure, the card rolls back to its original column and a brief error banner is shown (auto-dismisses after ~3s). Dropping within the same column is a no-op (no PUT fired). dnd-kit's `over.id` can resolve to either a column droppable id or a sortable task id in `handleDragEnd`; a `VALID_STATUSES` set distinguishes the two cases.

### Requirement: Header Bar

The MANTYS Kanban logo, user avatar, and logout button are always visible, in every board state (loading, filtered, empty).

## Known Gaps (as of the latest archived change)

- No frontend test coverage for board interactions (no test runner in `apps/web` — see `web-app`).
- `PUT /tasks/:id` from the client omits the `Authorization` header by design, since Tasks routes are unguarded (see `task-management`); the SSR fetch sends a Bearer token for forward-compatibility only.
