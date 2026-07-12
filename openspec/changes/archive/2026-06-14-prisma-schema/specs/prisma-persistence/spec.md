# prisma-persistence — Delta Spec (change: prisma-schema)

Reconstructed from Engram observation id 111.

## ADDED Requirements

### Requirement: Prisma Schema Definition

The system MUST declare a `schema.prisma` file that defines three models — `User`, `Project`, and `Task` — matching the domain contract in `packages/types`.

**User fields**: `id` (String, cuid, PK), `email` (String, unique), `password` (String), `name` (String), `role` (enum Role: OWNER | MEMBER), `createdAt` (DateTime, default now).

**Project fields**: `id` (String, cuid, PK), `name` (String), `description` (String, optional), `createdAt` (DateTime, default now).

**Task fields**: `id` (String, cuid, PK), `title` (String), `description` (String, optional), `priority` (enum Priority: A | B | C | D), `status` (enum TaskStatus: BACKLOG | TODO | IN_PROGRESS | REVIEW | DONE), `deadline` (DateTime, optional), `assigneeId` (String, optional, FK → User.id, onDelete SetNull), `projectId` (String, FK → Project.id, onDelete Cascade), `createdAt` (DateTime, default now), `updatedAt` (DateTime, updatedAt).

#### Scenario: Schema generates valid migration

- GIVEN the `schema.prisma` file is present and `DATABASE_URL` is set
- WHEN `prisma migrate dev` is executed
- THEN the migration succeeds and all three tables are created in PostgreSQL with correct columns and constraints

#### Scenario: ID format is cuid string

- GIVEN a User, Project, or Task is created via Prisma
- WHEN the record is retrieved
- THEN the `id` field is a non-empty String in cuid format (not a numeric integer)

#### Scenario: Email uniqueness enforced on User

- GIVEN a User with email "alice@example.com" already exists in the database
- WHEN a second User creation is attempted with the same email
- THEN Prisma raises a unique constraint violation error (P2002)
- AND the second user is NOT persisted

### Requirement: PrismaService Lifecycle

The system MUST provide a `PrismaService` that extends `PrismaClient`, connects on module init, and disconnects on module destroy.

#### Scenario: PrismaService connects on application boot

- GIVEN the NestJS application starts
- WHEN `PrismaService.onModuleInit` is invoked
- THEN `$connect()` is called and the service is ready to execute queries

#### Scenario: PrismaService disconnects on application shutdown

- GIVEN the NestJS application is shutting down
- WHEN `PrismaService.onModuleDestroy` is invoked
- THEN `$disconnect()` is called and the database connection is released

### Requirement: PrismaModule Global Registration

The system MUST declare a `PrismaModule` decorated with `@Global()` that provides and exports `PrismaService`, registered once in `AppModule`.

#### Scenario: PrismaService injectable without re-import

- GIVEN `PrismaModule` is imported in `AppModule`
- WHEN any feature module (TasksModule, UsersModule, ProjectsModule) injects `PrismaService`
- THEN the injection resolves without that module re-importing `PrismaModule`

### Requirement: Environment Configuration

The system MUST provide a `.env.example` file at the repository root documenting `DATABASE_URL` as a required variable for Prisma connectivity.

#### Scenario: .env.example present and documents DATABASE_URL

- GIVEN the repository is cloned fresh
- WHEN a developer reads `.env.example`
- THEN `DATABASE_URL` is listed with a descriptive placeholder value (e.g., `postgresql://user:pass@localhost:5432/db`)

## Non-Functional Requirements

### Requirement: No Mongoose Dependencies After Slice 2

After Slice 2 is complete, the system MUST NOT depend on `mongoose`, `@nestjs/mongoose`, or `mongodb-memory-server`. These packages MUST be removed from `apps/api/package.json`.

#### Scenario: Mongoose packages absent post-migration

- GIVEN Slice 2 is applied
- WHEN `apps/api/package.json` is inspected
- THEN `mongoose`, `@nestjs/mongoose`, and `mongodb-memory-server` are not listed in any dependency block

### Requirement: Type Contract Alignment

Prisma model field shapes MUST be compatible with the types exported by `packages/types`. The `id` field on all models MUST be `String` (cuid). Enum values in the schema MUST match enum values in `packages/types` exactly.

#### Scenario: Prisma id type matches packages/types

- GIVEN the Prisma schema declares `id String @default(cuid())`
- WHEN a TasksService method returns a Prisma task record
- THEN the `id` field type is assignable to the `id: string` field in the `Task` type from `packages/types`
