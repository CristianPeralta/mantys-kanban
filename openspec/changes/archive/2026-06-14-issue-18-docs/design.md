# Design: MANTYS Kanban API Documentation Update (issue-18-docs)

Reconstructed from Engram observation id 197.

## Technical Approach

Documentation/annotation-only change, no runtime behavior changes. Three workstreams: (1) Swagger annotation completion (DocumentBuilder metadata + tags, AuthController operation docs, `@ApiProperty` on all DTO fields, PartialType swap), (2) tag-casing normalization to PascalCase, (3) README full rewrite + new `.env.example`.

## Ground-Truth Corrections (source brief vs. actual codebase)

- Relation is 1:n, not n:m: `User -[AssignedTasks]-> Task[]` via `Task.assigneeId` (`onDelete: SetNull`); `Project -> Task[]` (`onDelete: Cascade`).
- `Priority` = A | B | C | D (default A), not High/Medium/Low.
- `Role` = OWNER | MEMBER (default MEMBER). `TaskStatus` = BACKLOG | TODO | IN_PROGRESS | REVIEW | DONE (default BACKLOG).
- `CreateTaskDto` has 7 fields including `deadline` (ISO string) — the source brief omitted it.
- Tasks/Users/Projects routes are UNGUARDED; only `GET /auth/profile` requires Bearer. Endpoints table must reflect this real (not aspirational) auth state.
- `register` returns 409 on duplicate email (not just 400 on validation) — document both.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| PartialType source | Swap 3 Update DTOs to `@nestjs/swagger` | Inherits `@ApiProperty` metadata for Swagger rendering; still re-applies class-validator; backward compatible |
| ApiProperty shape | `{ description, example, required?, enum? }` | Populates schema + examples; enum dropdowns for Prisma enums |
| Enum import in DTOs | Reuse existing `@prisma/client` enum imports | No new imports, single source of truth |
| Auth response codes | register 201/400/409, login 200/401, profile 200/401 | Matches actual AuthService + ValidationPipe behavior |
| README data model | Document the real Prisma schema, not the brief's incorrect n:m claim | Docs must match schema |
| `.env` scope | `apps/api/.env.example` | ConfigModule `envFilePath` is relative to `apps/api` |

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/main.ts` | Modify | Title → 'MANTYS Kanban API', description, `.addTag()` x4 |
| `apps/api/src/auth/auth.controller.ts` | Modify | `ApiOperation`/`ApiResponse` on all 3 routes |
| `apps/api/src/projects/projects.controller.ts` | Modify | `@ApiTags('projects')` → `'Projects'` |
| `apps/api/src/users/users.controller.ts` | Modify | `@ApiTags('users')` → `'Users'` |
| `apps/api/src/dto/create-task.dto.ts` | Modify | `@ApiProperty` on 7 fields (enums via `enum:`) |
| `apps/api/src/dto/create-project.dto.ts` | Modify | `@ApiProperty` on name, description? |
| `apps/api/src/dto/create-user.dto.ts` | Modify | `@ApiProperty` on email, password, name, role? |
| `apps/api/src/dto/login.dto.ts` | Modify | `@ApiProperty` on email, password |
| `apps/api/src/dto/update-task.dto.ts` | Modify | PartialType import → `@nestjs/swagger` |
| `apps/api/src/dto/update-project.dto.ts` | Modify | PartialType import → `@nestjs/swagger` |
| `apps/api/src/dto/update-user.dto.ts` | Modify | PartialType import → `@nestjs/swagger` |
| `apps/api/.env.example` | Create | DATABASE_URL, JWT_SECRET, PORT |
| `README.md` | Modify | Full rewrite |

## README Content Spec (rewrite outline)

1. Title "MANTYS Kanban API" + concise description.
2. Stack table: NestJS 9, TypeScript 5, PostgreSQL 16, Prisma 5, JWT (Passport + bcrypt).
3. Architecture: AppModule → ConfigModule(global), PrismaModule, TasksModule, UsersModule, ProjectsModule, AuthModule.
4. Data model: 3 entities (User, Project, Task), 3 enums (Role, Priority, TaskStatus), real relations (SetNull / Cascade).
5. Endpoints table (method | path | auth | description) for all 17 routes, honestly stating only `GET /auth/profile` is guarded today.
6. How to run: prereqs (Node 20, PostgreSQL 16); clone; `npm install`; copy `apps/api/.env.example` → `.env` (+ `.env.test`); `npx prisma migrate dev`; `npm run start:dev`; test commands; Swagger at `/api`.
7. Remove all MongoDB / Node-19 / `done`-boolean content.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Build | TS compiles after PartialType swap + ApiProperty | `npm run build` |
| Unit | Existing DTO/controller/service specs unaffected | `npm run test` |
| E2E | register→login→task flow still green | `npm run test:e2e` |
| Manual | `/api` renders populated schemas, enum dropdowns, 4 tags | open Swagger UI |

## Migration / Rollout

No migration. Single PR, git-revertable, no schema/data impact.
