# task-management

Current-state spec, synthesized from `openspec/changes/archive/2026-06-14-prisma-schema/` (base CRUD via Prisma) and `2026-06-14-issue-22-kanban-board/` (assignee include + `projectId` filter, delta-named `task-api` in that change but same underlying capability).

> Gap: `issue-23-task-crud` (GitHub #23, PR #39, merged to `main`) added the web-side create/edit/delete `TaskModal`, filters toolbar, and real-user avatar. Its only Engram source is a bare `apply-progress` observation (no spec) — see `openspec/changes/archive/2026-06-14-issue-23-task-crud/tasks.md` for what's recoverable. Web-side task CRUD UI behavior is therefore not formally spec'd here.

## Purpose

CRUD for the `Task` resource: the core Kanban unit, with priority, status, optional deadline, optional assignee, and a required owning project.

## Requirements

### Requirement: Task Persistence via Prisma

`TasksService` MUST use `prisma.task.*` for all persistence. `update`/`remove` on a missing id MUST catch Prisma `P2025` and return `null` (not throw) — this is the one service in the codebase that returns `null` instead of raising `NotFoundException` on update/remove, preserved for backward compatibility with the pre-Prisma controller contract.

`CreateTaskDto` requires `title` and `projectId`; `priority`, `status`, `description`, `deadline`, `assigneeId` are optional with schema-level defaults (`Priority.A`, `TaskStatus.BACKLOG`) applied when omitted.

### Requirement: List Tasks — Filter and Assignee Include

`GET /tasks` MUST return all tasks when no query parameters are supplied. When a `projectId` query parameter is supplied, the response MUST be filtered to only tasks with that `projectId`; an unknown `projectId` returns `[]` (HTTP 200, not 404).

Every task in the response MUST include an `assignee` field: `{ id, name, email }` when assigned, `null` when not — never omitted or `undefined`. This requires `include: { assignee: { select: { id, name, email } } }` on both `findAll` and `findOne`/`findOne`-equivalent Prisma calls, and on the `create` response (added later to keep the create-response shape consistent with `findAll`, per the `bugfix/tasks-create-include-assignee` fix folded into `issue-40-project-management`, which has no formal SDD trail — see the reconstruction report).

#### Scenario: Assignee is present or explicitly null

- GIVEN a task with no assigned user
- WHEN `GET /tasks` is called
- THEN the task object includes `assignee: null` (not omitted)

### Requirement: No Auth Guard on Task Routes

`GET/POST/PUT/DELETE /tasks*` are UNGUARDED as of the latest archived change — no `JwtAuthGuard` applied. Web clients call these endpoints directly without a Bearer token (documented, deliberate — see `kanban-board` domain).

## Known Limitation

`update`/`remove` returning `null` on not-found (rather than a 404 exception) is an intentional legacy-compatibility choice, inconsistent with `UsersService`/`ProjectsService.remove()`, which throw `NotFoundException`. Not unified as of the latest archived change.
