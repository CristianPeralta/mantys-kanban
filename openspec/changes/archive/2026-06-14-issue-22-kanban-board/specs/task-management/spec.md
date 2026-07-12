# task-management — Delta Spec (change: issue-22-kanban-board)

Reconstructed from Engram observation id 258.

## MODIFIED Requirements

### Requirement: List Tasks

The `GET /tasks` endpoint MUST return all tasks when no query parameters are supplied (existing behavior preserved).

When a `projectId` query parameter is provided, the endpoint MUST return only tasks whose `projectId` field matches the supplied value; tasks belonging to other projects MUST NOT appear in the response.

Every task object in the response MUST include an `assignee` field. The `assignee` field MUST be an object `{ id, name, email }` when the task has an assigned user, and MUST be `null` when the task is unassigned. The `assignee` field MUST NOT be omitted or `undefined`.

(Previously: `GET /tasks` returned all tasks with no project filtering and no `assignee` field in the response.)

#### Scenario: List all tasks (no filter)

- GIVEN the API receives `GET /tasks` with no query parameters
- WHEN the request is processed
- THEN the response MUST contain all tasks in the system
- AND each task object MUST include `assignee: { id, name, email }` or `assignee: null`

#### Scenario: List tasks filtered by project

- GIVEN a `projectId` belonging to an existing project
- WHEN `GET /tasks?projectId=<id>` is called
- THEN the response MUST contain only tasks where `task.projectId === id`
- AND tasks from other projects MUST NOT appear in the response

#### Scenario: Filter with non-existent projectId

- GIVEN a `projectId` that matches no project or task
- WHEN `GET /tasks?projectId=<unknown>` is called
- THEN the response MUST be an empty array `[]`
- AND the status code MUST be 200

#### Scenario: Assignee is present

- GIVEN a task that has an assigned user
- WHEN `GET /tasks` is called
- THEN the task object MUST include `assignee: { id: string, name: string, email: string }`

#### Scenario: Assignee is absent

- GIVEN a task with no assigned user
- WHEN `GET /tasks` is called
- THEN the task object MUST include `assignee: null`

> Implementation note: the shipped `where` clause is `projectId ? { projectId } : {}` (not `undefined` as an earlier spec draft said) — Prisma-equivalent, tests assert `where: {}`. Documented here as the current, correct behavior.
