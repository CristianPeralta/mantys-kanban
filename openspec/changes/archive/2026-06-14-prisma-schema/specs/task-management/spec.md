# task-management — Delta Spec (change: prisma-schema)

Reconstructed from Engram observation id 111.

## MODIFIED Requirements

### Requirement: Task Persistence via Prisma

The system MUST persist Task records using `PrismaService` (not Mongoose). TasksService MUST use `prisma.task.create`, `prisma.task.findMany`, `prisma.task.findUnique`, `prisma.task.update`, and `prisma.task.delete`.

(Previously: TasksService used a Mongoose model for persistence with a `done: boolean` field and unique constraint on `title`.)

#### Scenario: Create task with full Prisma fields

- GIVEN a valid CreateTaskDto with `title`, `priority`, `status`, and `projectId`
- WHEN `POST /tasks` is called
- THEN the task is persisted via Prisma, an `id` (cuid String) is assigned, and the full task object is returned

#### Scenario: Create task with optional fields

- GIVEN a CreateTaskDto that includes `description`, `deadline`, and `assigneeId`
- WHEN `POST /tasks` is called
- THEN all optional fields are persisted and returned correctly

#### Scenario: List all tasks

- GIVEN one or more tasks exist in the database
- WHEN `GET /tasks` is called
- THEN all task records are returned as an array via `prisma.task.findMany`

#### Scenario: Update task status

- GIVEN a task with id "abc123" exists and has status BACKLOG
- WHEN `PATCH /tasks/abc123` is called with `{ "status": "IN_PROGRESS" }`
- THEN the task is updated via `prisma.task.update` and the updated record is returned

#### Scenario: Delete task

- GIVEN a task with id "abc123" exists
- WHEN `DELETE /tasks/abc123` is called
- THEN the task is removed via `prisma.task.delete` and a 200 or 204 response is returned

#### Scenario: Task not found returns 404

- GIVEN no task with the given id exists
- WHEN `GET /tasks/:id` or `PATCH /tasks/:id` or `DELETE /tasks/:id` is called
- THEN a 404 Not Found response is returned

### Requirement: Task DTO Alignment

Task DTOs MUST reflect the Prisma schema fields. `CreateTaskDto` MUST include `title` (required), `projectId` (required); `priority`, `status`, `description`, `deadline`, `assigneeId` are optional with schema-level defaults (Priority.A, TaskStatus.BACKLOG apply when omitted). The `done` field MUST NOT exist in any Task DTO.

#### Scenario: DTO rejects missing required fields

- GIVEN a request body missing `title` or `projectId`
- WHEN `POST /tasks` is called
- THEN a 400 Bad Request is returned with validation errors

#### Scenario: DTO rejects invalid enum value

- GIVEN a request body with `priority: "Z"` (not in A|B|C|D)
- WHEN `POST /tasks` is called
- THEN a 400 Bad Request is returned

> Note: the original delta spec (obs #111) stated priority/status as required, but the actual task brief and shipped implementation made them optional with Prisma schema defaults. Verify-report (obs #130) flagged this as an intentional, functionally-correct divergence — documented here as the final, current behavior.

### Requirement: Task Unit Tests with Mocked PrismaService

Task unit tests MUST mock `PrismaService` via `jest.mock` or NestJS testing overrides. Tests MUST NOT connect to a real database or use mongodb-memory-server.

#### Scenario: Unit test isolates PrismaService

- GIVEN `PrismaService` is mocked with `prisma.task.create` returning a fake task
- WHEN `TasksService.create` is called
- THEN the service returns the mocked task and `prisma.task.create` was called with the correct arguments
