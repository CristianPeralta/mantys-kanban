# documentation — Delta Spec (change: issue-18-docs)

Reconstructed from Engram observation id 196. No endpoint behavior changes — all requirements apply to static files, annotations, and build-time metadata.

## ADDED Requirements

### Requirement: README Content

`README.md` at the repository root MUST accurately describe the MANTYS Kanban API project: title "MANTYS Kanban API"; stack (NestJS 9.x, TypeScript, PostgreSQL, Prisma ORM, JWT, bcrypt); architecture (all modules named); data model (User/Task/Project with fields and relations); endpoints (Auth, Tasks, Projects, Users); a self-contained "How to run" section referencing `apps/api/.env.example`.

#### Scenario: README renders correct project identity

- GIVEN the repository root README.md is opened
- WHEN a reader views the title and stack section
- THEN the title reads "MANTYS Kanban API" and the stack lists NestJS, PostgreSQL, Prisma, JWT, and bcrypt
- AND no reference to MongoDB, Node 19, or "Tasks API" appears

#### Scenario: README how-to-run is self-contained

- GIVEN a developer with no prior context clones the repo
- WHEN they follow the README "How to run" steps
- THEN they can find all required env vars, run migrations, and start the server without consulting any other file

### Requirement: .env.example File

`apps/api/.env.example` MUST exist with placeholder values for `DATABASE_URL`, `JWT_SECRET`, and `PORT`. Values MUST NOT be real credentials.

#### Scenario: .env.example exists with all required keys

- GIVEN the repository is cloned fresh
- WHEN a developer inspects `apps/api/.env.example`
- THEN the file exists and contains DATABASE_URL, JWT_SECRET, and PORT keys with example values

### Requirement: Swagger DocumentBuilder Metadata

`DocumentBuilder` in `apps/api/src/main.ts` MUST have title "MANTYS Kanban API", declare all four tags ('Auth', 'Tasks', 'Projects', 'Users' — PascalCase), and retain `.addBearerAuth()`.

#### Scenario: All tag groups appear in Swagger UI

- GIVEN the API server is running
- WHEN a browser navigates to `/api`
- THEN four tag sections appear: Auth, Tasks, Projects, Users

### Requirement: Controller ApiTags Casing

All four controllers MUST declare `@ApiTags` with PascalCase values matching the DocumentBuilder tags: TasksController→'Tasks', AuthController→'Auth', ProjectsController→'Projects', UsersController→'Users'.

### Requirement: AuthController Swagger Annotations

All three AuthController routes (`POST /auth/register`, `POST /auth/login`, `GET /auth/profile`) MUST have `@ApiOperation` and at least one `@ApiResponse` decorator.

### Requirement: DTO ApiProperty Annotations

All seven DTOs (CreateTaskDto, UpdateTaskDto, CreateProjectDto, UpdateProjectDto, CreateUserDto, UpdateUserDto, LoginDto) MUST declare `@ApiProperty()` on every field so Swagger renders populated request body schemas with enum values where applicable.

#### Scenario: Request body schemas are populated in Swagger UI

- GIVEN the Swagger UI at `/api`
- WHEN a POST or PATCH endpoint is expanded and "Schema" is selected
- THEN the request body schema shows all fields with types and enum values where applicable
- AND no field shows as "unknown" or empty

### Requirement: Update DTOs Use PartialType from @nestjs/swagger

`UpdateTaskDto`, `UpdateProjectDto`, and `UpdateUserDto` MUST import `PartialType` from `@nestjs/swagger`, not `@nestjs/mapped-types`, so Swagger schema inheritance works.

#### Scenario: Existing tests still pass after import swap

- GIVEN the codebase with updated PartialType imports
- WHEN the full test suite (unit + e2e) is executed
- THEN all previously passing tests continue to pass

### Requirement: Non-goals

No Mermaid/Prisma ERD diagram, no new API endpoints, no auth guard/authorization behavior changes are introduced by this change.
