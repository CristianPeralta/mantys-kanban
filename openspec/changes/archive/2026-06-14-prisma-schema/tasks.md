# Tasks: Prisma + PostgreSQL Migration (prisma-schema)

Reconstructed from Engram observations id 114 (task plan) and id 118 (apply-progress). All slices completed.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,400–1,800 total (all 4 slices) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Delivery strategy | auto-chain (incremental slices, 4 PRs chained to main) |
| Chain strategy | stacked-to-main |

## Slice 1: Prisma Infrastructure — [x] DONE
**Branch**: `feat/prisma-schema-slice-1-infra` · **PR #25** · merged to main

- [x] 1.1 `apps/api/package.json` — add `@prisma/client` (dep) and `prisma` (devDep); add `prisma.schema` path + `postinstall` generate script
- [x] 1.2 `npm install` inside `apps/api`
- [x] 1.3 Create `.env.example` at repo root with `DATABASE_URL=postgresql://user:pass@localhost:5432/mantys_kanban`
- [x] 1.4 `docker-compose.yml` — add `DATABASE_URL` env var to `api` service pointing at `postgres` host
- [x] 1.5 Create `apps/api/prisma/schema.prisma` — datasource, generator, enums (Role, Priority, TaskStatus), models (User, Project, Task)
- [x] 1.6 Create `apps/api/src/prisma/prisma.service.ts` — extends PrismaClient, OnModuleInit/OnModuleDestroy
- [x] 1.7 Create `apps/api/src/prisma/prisma.module.ts` — `@Global()`, provides+exports PrismaService
- [x] 1.8 `apps/api/src/app.module.ts` — import PrismaModule; keep MongooseModule temporarily
- [x] 1.9 `npx prisma generate` inside `apps/api` (NOT `migrate dev` — run manually against a real DB, per task brief)
- [x] 1.10 `apps/api/test/jest-e2e.json` — document `prisma migrate deploy` requirement before e2e

## Slice 2: Task Domain Migration — [x] DONE
**Branch**: `feat/prisma-schema-slice-2-tasks` · **PR #26** · merged to main

- [x] 2.1 Delete `apps/api/src/schemas/task.schema.ts`
- [x] 2.2 `apps/api/package.json` — remove `mongoose`, `@nestjs/mongoose`, `mongodb-memory-server`
- [x] 2.3 `apps/api/src/app.module.ts` — remove MongooseModule.forRootAsync
- [x] 2.4 Rewrite `apps/api/src/dto/create-task.dto.ts` (title/projectId required; description/priority/status/deadline/assigneeId optional; drop `done`)
- [x] 2.5 Rewrite `apps/api/src/dto/update-task.dto.ts` — `PartialType(CreateTaskDto)`
- [x] 2.6 Rewrite `apps/api/src/tasks/tasks.service.ts` — PrismaService, catch P2025 → return null on update/remove
- [x] 2.7 `apps/api/src/tasks/tasks.module.ts` — remove `MongooseModule.forFeature`
- [x] 2.8 `apps/api/src/tasks/tasks.controller.ts` — remove 11000 duplicate-key handler
- [x] 2.9 Rewrite `apps/api/src/tasks/tasks.service.spec.ts` — mock PrismaService (24 unit tests)
- [x] 2.10 Rewrite `apps/api/test/tasks.e2e-spec.ts` — PrismaService, seed Project in beforeEach, deleteMany cleanup

## Slice 3: User Module — [x] DONE
**Branch**: `feat/prisma-schema-slice-3-users` · **PR #27** · merged to main

- [x] 3.1 Create `apps/api/src/dto/create-user.dto.ts` (email, password, name, role?)
- [x] 3.2 Create `apps/api/src/dto/update-user.dto.ts` — `PartialType(CreateUserDto)`
- [x] 3.3 Create `apps/api/src/users/users.service.ts` — CRUD, P2002 → ConflictException, P2025 → NotFoundException, password stripped via `select`
- [x] 3.4 Create `apps/api/src/users/users.controller.ts` — GET/POST/PUT/DELETE `/users`, Swagger decorators
- [x] 3.5 Create `apps/api/src/users/users.module.ts`
- [x] 3.6 `apps/api/src/app.module.ts` — import UsersModule
- [x] 3.7 Create `apps/api/src/users/users.service.spec.ts` — 13 unit tests, TDD (spec written before service existed)

## Slice 4: Project Module — [x] DONE
**Branch**: `feat/prisma-schema-slice-4-projects` · **PR #28** (landed on wrong base, fixed via follow-up **PR #30** `fix/add-projects-module`) · merged to main

- [x] 4.1 Create `apps/api/src/dto/create-project.dto.ts` (name required, description optional)
- [x] 4.2 Create `apps/api/src/dto/update-project.dto.ts` — `PartialType(CreateProjectDto)`
- [x] 4.3 Create `apps/api/src/projects/projects.service.ts` — CRUD, P2025 → NotFoundException on update/remove, `findOne` returns null
- [x] 4.4 Create `apps/api/src/projects/projects.controller.ts` — GET/POST/PUT/DELETE `/projects`, Swagger decorators
- [x] 4.5 Create `apps/api/src/projects/projects.module.ts`
- [x] 4.6 `apps/api/src/app.module.ts` — import ProjectsModule
- [x] 4.7 Create `apps/api/src/projects/projects.service.spec.ts` — 10 unit tests, TDD

## Note on PR #29 and PR #30

Two follow-up PRs were needed to land this change cleanly on `main`:
- **PR #29** `ci: replace CircleCI trigger with GitHub Actions` — unrelated CI fix, merged alongside this change.
- **PR #30** `fix: add ProjectsModule to main (PR #28 landed on wrong base)` — PR #28 (Slice 4) was opened against `feat/prisma-schema-slice-3-users` instead of `main`, so its ProjectsModule code never reached `main` directly. PR #30 re-added the same ProjectsController/Service/DTOs directly against `main` to correct this.
