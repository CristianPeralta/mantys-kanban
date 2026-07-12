# Design: Migrate API persistence to Prisma + PostgreSQL

Reconstructed from Engram observation id 112.

## Technical Approach

Introduce a global `PrismaModule`/`PrismaService` (single `PrismaClient` with connect/disconnect lifecycle), define one `schema.prisma` with User/Project/Task + enums mirroring `packages/types`, then migrate services to call `prisma.<model>.<method>()` directly. No repository abstraction — at this scale, `PrismaService` IS the data-access layer. IDs are `cuid()` Strings to match `id: string` in the shared contract. Incremental slices keep CI green.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Data access | Services use `PrismaService` directly | Repository/UoW layer | Thin CRUD; abstraction adds boilerplate with no payoff at 3 models |
| Module scope | `@Global() PrismaModule`, imported once in AppModule | `forFeature`-style per-module imports | One client instance; Mongoose's per-feature model registration has no Prisma equivalent |
| Lifecycle | `PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy` | Manual connect in main.ts | Nest-idiomatic, ties pool to app lifecycle |
| IDs | `String @id @default(cuid())` | `Int autoincrement` / Mongo ObjectId | Matches `packages/types` `id: string`; portable, non-sequential |
| Types | Keep `packages/types` as contract | Use Prisma-generated types in app | Shared package is the cross-app source of truth (frontend too) |
| Unit tests | `jest.mock` PrismaService (no DB) | mongodb-memory-server equivalent | No in-memory Postgres; mock the client for fast unit isolation |
| E2E tests | Real Postgres from docker-compose + transaction/deleteMany cleanup | Testcontainers | Compose already provisions PG; reuse it |

## Data Flow

```
Controller ──DTO──> Service ──> PrismaService(PrismaClient) ──> PostgreSQL
                                     ▲
                          @Global() PrismaModule (1 instance)
```

## Interfaces / Contracts

```prisma
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }
generator client { provider = "prisma-client-js" }

enum Role { OWNER MEMBER }
enum Priority { A B C D }
enum TaskStatus { BACKLOG TODO IN_PROGRESS REVIEW DONE }

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  role      Role     @default(MEMBER)
  createdAt DateTime @default(now())
  tasks     Task[]   @relation("AssignedTasks")
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  createdAt   DateTime @default(now())
  tasks       Task[]
}

model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  priority    Priority   @default(A)
  status      TaskStatus @default(BACKLOG)
  deadline    DateTime?
  assigneeId  String?
  assignee    User?      @relation("AssignedTasks", fields: [assigneeId], references: [id], onDelete: SetNull)
  projectId   String
  project     Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}
```

```ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

Service method mapping: `find()` → `findMany`; `findById` → `findUnique({where:{id}})`; `new+save` → `create({data})`; `findByIdAndUpdate` → `update({where:{id},data})`; `findByIdAndDelete` → `delete({where:{id}})`. Prisma `update`/`delete` THROW (P2025) on missing id instead of returning null — resolved per-service: TasksService catches P2025 and returns null (Mongo-parity with the pre-existing controller contract); UsersService and ProjectsService throw `NotFoundException` on update/remove P2025 (ProjectsService's `findOne` alone returns null for the not-found read case).

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | TasksService/UsersService/ProjectsService logic, arg mapping | jest.mock PrismaService; assert prisma calls |
| E2E | CRUD over HTTP | Real Postgres (compose); seed a Project in beforeEach (required FK); cleanup via `prisma.task.deleteMany`/`prisma.project.deleteMany`; `NODE_ENV=test` |
| Migration | Schema applies | `prisma migrate deploy` in CI before e2e |

## Migration / Rollout

Greenfield cutover — no Mongo data migration. Per-slice PRs; Slice 1 additive (Prisma alongside Mongoose) so revert restores Mongoose-only. Dev DB is disposable: drop/recreate.

## Open Questions (as of design time)

- Missing-record behavior: catch P2025 → return null (Mongo parity) vs throw NotFoundException. Resolved during apply: Task keeps null-return parity; User/Project throw NotFoundException on update/remove (documented above).
- Seed strategy for e2e (a Project + User must exist before a Task due to required `projectId`): resolved with a per-test `beforeEach` seed of a Project record.
