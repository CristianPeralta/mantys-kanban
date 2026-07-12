# kanban-board — Delta Spec (change: issue-22-kanban-board)

Reconstructed from Engram observation id 258.

## Purpose

Full-page Kanban view that shows tasks grouped by status across 5 columns. Users can filter by project via a sidebar and move tasks between columns by drag-and-drop.

## ADDED Requirements

### Requirement: Board Route

The board view MUST be accessible at the `/board` route.

#### Scenario: Navigate to board

- GIVEN an authenticated user
- WHEN they navigate to `/board`
- THEN the board page MUST render with a sidebar and a 5-column main area

### Requirement: Initial Data Load

The board page MUST perform data fetching server-side (SSR) using the `auth-token` cookie as a Bearer token. The fetched data MUST be passed as initial props to the client component.

#### Scenario: SSR data available

- GIVEN a valid `auth-token` cookie is present
- WHEN the server renders `/board`
- THEN tasks and projects MUST be fetched before HTML is sent to the client
- AND the client component MUST receive tasks and projects as initial props

### Requirement: Project Sidebar

The board MUST render a sidebar that lists all available projects. Selecting a project MUST filter the board to show only tasks belonging to that project. When no project is selected, all tasks MUST be shown.

#### Scenario: Project selected

- GIVEN a project is clicked in the sidebar
- WHEN the board updates
- THEN only tasks where `projectId` matches the selected project MUST appear in columns
- AND tasks from other projects MUST NOT appear

#### Scenario: Project deselected

- GIVEN a project is currently selected
- WHEN the user deselects it (or selects "All")
- THEN the board MUST revert to showing all tasks

### Requirement: Five Columns Layout

The board MUST render exactly 5 columns in this fixed order: BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE. Columns MUST be displayed side by side. On viewports where all columns do not fit, the container MUST scroll horizontally.

#### Scenario: Mobile horizontal scroll

- GIVEN a viewport narrower than the total column width
- WHEN the board renders
- THEN the user MUST be able to scroll horizontally to reach all 5 columns

#### Scenario: Empty column

- GIVEN a status has no tasks
- WHEN the board renders
- THEN that column MUST render with its header and an empty state (no error, no missing column)

### Requirement: Column Header

Each column MUST display a tinted header using a dark color variant associated with its status, a human-readable status label, and a count badge showing the number of tasks in that column.

#### Scenario: Count badge reflects task count

- GIVEN column IN_PROGRESS contains 3 tasks
- WHEN the column renders
- THEN the count badge MUST display "3"

### Requirement: Task Card

Each task MUST be represented by a card inside its column, displaying: task title, priority badge (A/B/C/D with status-specific color), assignee avatar (initials fallback when no avatar URL is available), and deadline (formatted date, omitted if null). The card MUST have a left-side colored priority strip.

Priority color mapping MUST be: A=red, B=orange, C=yellow, D=green.

#### Scenario: Card without assignee

- GIVEN a task with no assigned user
- WHEN the card renders
- THEN the assignee avatar MUST be absent or show a placeholder; no error MUST be thrown

#### Scenario: Card without deadline

- GIVEN a task with no deadline
- WHEN the card renders
- THEN no deadline date MUST appear on the card; other fields MUST remain

### Requirement: Drag-and-Drop Status Change

A user MUST be able to drag a task card from one column and drop it onto a different column. On drop, the card MUST move to the target column immediately (optimistic update) and `PUT /tasks/:id` MUST be called with `{ status: newStatus }`.

On PUT success, the UI state MUST remain as the optimistic update. On PUT failure, the card MUST snap back to its original column (rollback), and a brief error indication MUST be shown.

#### Scenario: Successful drag-and-drop

- GIVEN a card in column BACKLOG
- WHEN the user drags it and drops it onto column TODO
- THEN the card MUST appear in TODO immediately (optimistic)
- AND `PUT /tasks/:id` MUST be called with `{ status: "TODO" }`
- AND on success the card MUST remain in TODO

#### Scenario: Failed drag-and-drop (rollback)

- GIVEN a card in column BACKLOG
- WHEN the user drags it to TODO and the subsequent PUT fails
- THEN the card MUST return to BACKLOG
- AND an error indication (toast or border flash) MUST be shown

#### Scenario: Drag within same column

- GIVEN a card already in column IN_PROGRESS
- WHEN the user drops it back onto IN_PROGRESS
- THEN the card MUST remain in IN_PROGRESS and no PUT MUST be fired

### Requirement: Header Bar

The board page MUST preserve the existing header bar containing the MANTYS Kanban logo, user avatar, and logout button, visible in every board state (loading, filtered, empty).

> Implementation note: as shipped, the error-indication requirement above is met by an absolute-positioned toast banner in `KanbanBoard.tsx` with a 3-second auto-dismiss, added after `sdd-verify` flagged its absence (verify-report obs #265, suggestion 3). This spec reflects the corrected, final behavior.
