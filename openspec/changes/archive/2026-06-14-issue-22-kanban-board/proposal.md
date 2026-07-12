# Proposal: Kanban Board Main View (Issue #22)

Reconstructed from Engram observations (ids 256, 257), change `issue-22-kanban-board`.

## Intent

The app had a placeholder `board/page.tsx` but no actual task management surface. Users need the core Kanban view: see their projects, view tasks across the 5-status lifecycle, and move a task between statuses by dragging. This is the primary workspace of the product — without it the app has auth but no value.

## Scope

### In Scope
- Server Component `board/page.tsx`: reads `auth-token` cookie, fetches tasks + projects from NestJS with Bearer token, passes initial data as props.
- `'use client'` `KanbanBoard` with 5 columns: BACKLOG / TODO / IN_PROGRESS / REVIEW / DONE.
- Sidebar with project list (highlights active project, drives `?projectId=` fetch).
- Cards: title, A/B/C/D priority badge (color), assignee avatar, deadline.
- Drag & drop via `@dnd-kit/core` + `/sortable` + `/utilities`. Drop → `PUT /tasks/:id` `{ status }`.
- Optimistic update with manual `useState` + rollback on error; loading states.
- Variant 3 design: tinted column headers + side priority strip (dark theme, shadcn vars).
- Mobile: `overflow-x-auto` horizontal scroll.
- **API (required, same PR)**: `findAll()` adds `include: { assignee: { select: { id, name, email } } }`; controller adds `@Query('projectId')` → `where: { projectId }`.

### Out of Scope
- Task create/edit UI (issue #23).
- Auth guards on tasks/projects endpoints (separate concern).
- React Query / SWR (explicit user choice — manual state).
- `PATCH /tasks/:id` (use existing `PUT`).

## Capabilities

### New Capabilities
- `kanban-board`: board view, columns, cards, drag-drop status change, project sidebar, optimistic updates.

### Modified Capabilities
- `task-api`: `GET /tasks` gains `?projectId=` filter and returns `assignee` (id/name/email).

## Approach

Approach A (Server Component fetch + client DnD). Server shell SSRs initial data using the cookie token; client `KanbanBoard` owns mutable optimistic state seeded from props. Drag-drop fires `PUT /tasks/:id` directly to NestJS (currently unguarded) with an Authorization header for forward-compatibility. Status→color maps use full static Tailwind class strings (purge-safe), never interpolated.

Rejected alternatives: a Route Handler proxy (Approach B — extra indirection, unneeded while the API is unguarded) and a hybrid SSR+proxy setup (Approach C — over-engineered for the current unguarded state).

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tailwind purges dynamic color classes | High | Static full-class map per status/priority |
| Optimistic rollback bugs on PUT failure | Med | Snapshot prev state before mutate; restore on catch |
| Assignee missing if include forgotten | Med | API change is in-scope, blocking |
| Unguarded API exposes all tasks | Low | `?projectId=` filter server-side |

## Rollback Plan

Revert the single PR. API changes are additive (new optional include/query param) — no migration, no data change, safe to revert independently.

## Success Criteria

- [x] Board renders projects + tasks grouped into 5 columns with correct cards.
- [x] Selecting a project filters tasks via `?projectId=`.
- [x] Dragging a card across columns persists via `PUT /tasks/:id` and survives reload.
- [x] Failed PUT rolls the card back to its prior column.
- [x] Assignee avatar renders from API data; horizontal scroll works on mobile.
