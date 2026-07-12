# Proposal: Migrate API persistence from Mongoose/MongoDB to Prisma + PostgreSQL

Reconstructed from Engram observations (ids 104, 110), change `prisma-schema` (GitHub issue #13).

## Intent

The API persisted only a `Task` entity via a Mongoose schema that did NOT match the domain. `packages/types` already defined the real contract (User, Project, Task with priority/status/deadline/assigneeId/projectId, Role/Priority/TaskStatus enums) and `docker-compose.yml` already provisioned PostgreSQL. The code was the laggard: still on Mongoose, missing User/Project, wrong Task shape, no `.env`. This change aligns persistence with the established domain contract and the provisioned infra.

## Scope

### In Scope
- Prisma schema for User, Project, Task (fields + relations matching `packages/types`)
- Global `PrismaModule` + `PrismaService` (connect/disconnect lifecycle)
- Migrate `TasksService`/DTOs/tests from Mongoose to Prisma
- New `UserModule` and `ProjectModule` (controllers, services, DTOs)
- Remove Mongoose/MongoDB deps; add `@prisma/client` + `prisma`
- `.env.example` documenting `DATABASE_URL`

### Out of Scope
- Auth implementation (JWT login/guards) — types exist but flow is deferred to issue #14
- Data migration from any existing Mongo data (greenfield cutover)
- Replacing `packages/types` with Prisma-generated types (shared types stay the contract)
- Frontend changes; CI pipeline changes beyond test commands

## Capabilities

### New Capabilities
- `prisma-persistence`: Prisma schema, migrations, global PrismaService infra
- `user-management`: User model + CRUD module
- `project-management`: Project model + CRUD module

### Modified Capabilities
- `task-management`: Task moves to Prisma; gains priority/status/deadline/assigneeId/projectId; loses `done` and `title` uniqueness

## Approach

Incremental slicing was chosen over a single big-bang PR. One Prisma schema defines all 3 models up front; modules migrate slice-by-slice so CI stays green.

- **Slice 1 — Infra**: install Prisma, write `schema.prisma` (all 3 models), global `PrismaModule`/`PrismaService`, initial migration, `.env.example`. No service rewrites yet (app kept Mongoose temporarily).
- **Slice 2 — Task**: rewrite `TasksService` to `prisma.task.*`, rewrite Task DTOs (priority/deadline/assigneeId/projectId), drop `done` + `title` uniqueness + Mongo 11000 handling, rewrite unit tests with mocked PrismaService and e2e against a real Postgres container. Remove Mongoose deps.
- **Slice 3 — User**: UserModule (controller/service/DTOs).
- **Slice 4 — Project**: ProjectModule (controller/service/DTOs).

ID strategy: `@id @default(cuid())` (String) — aligns with `id: string` in `packages/types`. PrismaModule is `@Global()` for simplicity at this scale.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Test strategy mismatch (no Mongo-memory equivalent for Postgres) | Med | jest.mock(PrismaService) for unit; real PG container for e2e (already in compose) |
| Transitional dual-ORM deps in Slice 1 | Low | Short-lived; deps removed in Slice 2 |
| ID type drift (Prisma Int vs string) | Low | Lock cuid() String in schema from Slice 1 |
| Task shape change breaks existing data | Low | Greenfield cutover, no Mongo data to migrate |

## Rollback Plan

Per-slice, revert the slice PR. Slice 1 is additive (Prisma alongside Mongoose) so reverting restores Mongoose-only. Postgres is disposable (no production data); drop and recreate the dev DB.

## Success Criteria

- [x] App boots against PostgreSQL via Prisma; no Mongoose/MongoDB deps remain
- [x] Task/User/Project CRUD works end-to-end with Prisma
- [x] Unit tests pass with mocked PrismaService
- [x] Prisma model IDs are cuid Strings matching `packages/types`
- [x] `.env.example` documents `DATABASE_URL`
