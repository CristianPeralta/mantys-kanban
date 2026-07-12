# prisma-persistence

Current-state spec, synthesized from `openspec/changes/archive/2026-06-14-prisma-schema/`. Unmodified by any later change.

## Purpose

Prisma + PostgreSQL is the sole persistence layer for the API. There is no repository/unit-of-work abstraction — `PrismaService` IS the data-access layer, called directly from each feature service.

## Requirements

### Requirement: Prisma Schema

The system MUST declare `apps/api/prisma/schema.prisma` with three models — `User`, `Project`, `Task` — and three enums: `Role` (OWNER | MEMBER, default MEMBER), `Priority` (A | B | C | D, default A), `TaskStatus` (BACKLOG | TODO | IN_PROGRESS | REVIEW | DONE, default BACKLOG).

All model IDs MUST be `String @id @default(cuid())` — not auto-incrementing integers — to match the `id: string` contract in `packages/types`.

`Task.assigneeId` is optional and relates to `User` with `onDelete: SetNull`. `Task.projectId` is required and relates to `Project` with `onDelete: Cascade`. `Project.slug` is `String @unique` (added in `issue-50-board-slug`).

#### Scenario: ID format is cuid string

- GIVEN a User, Project, or Task is created via Prisma
- WHEN the record is retrieved
- THEN the `id` field is a non-empty String in cuid format

### Requirement: PrismaService Lifecycle

`PrismaService` MUST extend `PrismaClient`, implement `OnModuleInit` (`$connect()`) and `OnModuleDestroy` (`$disconnect()`).

### Requirement: PrismaModule Global Registration

`PrismaModule` MUST be `@Global()`, provide and export `PrismaService`, registered once in `AppModule`. Any feature module can inject `PrismaService` without re-importing `PrismaModule`.

### Requirement: No Mongoose Dependencies

The codebase MUST NOT depend on `mongoose`, `@nestjs/mongoose`, or `mongodb-memory-server`. The project was migrated from Mongoose/MongoDB to Prisma/PostgreSQL in its first tracked SDD change; no trace of the old ORM remains.

### Requirement: Migrations Are Deployed via `prisma migrate deploy`

Schema changes are shipped as versioned migrations under `apps/api/prisma/migrations/`, applied via `npx prisma migrate deploy` — automatically on container start in production (see `deployment` domain), manually (`prisma migrate dev` / direct SQL) in local development.

## Known Limitations

- No audit trail beyond `createdAt`/`updatedAt` (no soft deletes).
- No pagination (`findMany` returns all matching records).
- No search/filtering beyond explicit query params added per-feature (e.g. Task's `projectId` filter).
- No transaction support used in the service layer (available via `prisma.$transaction` if ever needed).
