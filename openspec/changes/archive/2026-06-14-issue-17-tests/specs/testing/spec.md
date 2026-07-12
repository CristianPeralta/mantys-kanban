# testing — Delta Spec (change: issue-17-tests)

Reconstructed from Engram observation id 182. This is a test/config-only delta; it does not change product behavior.

## ADDED Requirements

### Requirement: E2E Test Database Connection

`apps/api/.env.test` MUST contain a `DATABASE_URL` entry pointing to the local PostgreSQL test database so `npm run test:e2e` succeeds locally without extra setup beyond the documented prerequisite. The CI environment MUST NOT be modified — CI already injects `DATABASE_URL`, which takes precedence over `.env.test`.

#### Scenario: E2E suite connects to test database locally

- GIVEN a local PostgreSQL instance with database `mantys_kanban_test` and schema applied via `prisma db push`
- AND `apps/api/.env.test` contains `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mantys_kanban_test`
- WHEN `npm run test:e2e` is executed from `apps/api/`
- THEN the Prisma client connects successfully and all e2e tests run without a connection error

### Requirement: Full-Flow E2E — Login → Create Task → Move Status

`apps/api/test/tasks.e2e-spec.ts` MUST contain a `describe("Full flow: login → create task → move status")` block that registers a user, authenticates, creates a task, and updates its status, with `afterAll` cleanup of the test user.

#### Scenario: Task status transitions to IN_PROGRESS then DONE

- GIVEN a test user is registered via `POST /auth/register` and logged in via `POST /auth/login`
- WHEN `POST /tasks` is called with `{ title, projectId }` and returns HTTP 201 with `status: 'BACKLOG'`
- AND `PUT /tasks/:id` is called with `{ status: 'IN_PROGRESS' }`, then `{ status: 'DONE' }`
- THEN both responses are HTTP 200 with the expected `status` value

> Note: the JWT obtained from login is captured but deliberately NOT sent as a Bearer token on the `/tasks` requests, because those routes have no `JwtAuthGuard` — sending a token would falsely imply enforcement that doesn't exist.

### Requirement: AuthService and TasksService Unit Coverage — No Regression

`auth.service.spec.ts` MUST cover register/validateUser/login happy and error paths without regression, plus a new `register()` rejection-propagation test. `tasks.service.spec.ts` MUST cover create/findAll/findOne/update/remove happy and P2025 paths without regression, plus new non-P2025 rethrow tests for `update` and `remove`.

#### Scenario: Full suites pass

- WHEN `npm run test` is executed from `apps/api/`
- THEN all AuthService and TasksService describe blocks exit green with no failures
