# MANTYS Kanban API

A RESTful Kanban task-management API built with NestJS, PostgreSQL, and Prisma. Supports user authentication, projects, and tasks with priority and status tracking.

## Stack

| Technology | Version |
|------------|---------|
| NestJS | 9.x |
| TypeScript | 5.x |
| PostgreSQL | 16.x |
| Prisma ORM | 5.x |
| JWT (Passport) | — |
| bcrypt | — |

## Architecture

```
AppModule
├── ConfigModule (global)
├── PrismaModule
├── AuthModule
├── TasksModule
├── UsersModule
└── ProjectsModule
```

## Data Model

### Entities

**User**
| Field | Type | Notes |
|-------|------|-------|
| id | string (cuid) | Primary key |
| email | string | Unique |
| password | string | bcrypt hash |
| name | string | Display name |
| role | Role | Default: MEMBER |
| createdAt | DateTime | Auto |
| tasks | Task[] | Assigned tasks |

**Project**
| Field | Type | Notes |
|-------|------|-------|
| id | string (cuid) | Primary key |
| name | string | — |
| description | string? | Optional |
| createdAt | DateTime | Auto |
| tasks | Task[] | Project tasks |

**Task**
| Field | Type | Notes |
|-------|------|-------|
| id | string (cuid) | Primary key |
| title | string | — |
| description | string? | Optional |
| priority | Priority | Default: A |
| status | TaskStatus | Default: BACKLOG |
| deadline | DateTime? | Optional |
| assigneeId | string? | FK → User (SetNull on delete) |
| projectId | string | FK → Project (Cascade on delete) |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

### Enums

| Enum | Values |
|------|--------|
| Role | OWNER, MEMBER |
| Priority | A, B, C, D |
| TaskStatus | BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE |

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | None | Register a new user |
| POST | /auth/login | None | Log in and receive a JWT access token |
| GET | /auth/profile | Bearer | Get the authenticated user profile |
| GET | /users | None | Get all users |
| POST | /users | None | Create a new user |
| GET | /users/:id | None | Get a user by ID |
| PUT | /users/:id | None | Update a user |
| DELETE | /users/:id | None | Delete a user |
| GET | /projects | None | Get all projects |
| POST | /projects | None | Create a new project |
| GET | /projects/:id | None | Get a project by ID |
| PUT | /projects/:id | None | Update a project |
| DELETE | /projects/:id | None | Delete a project |
| GET | /tasks | None | Get all tasks |
| POST | /tasks | None | Create a new task |
| GET | /tasks/:id | None | Get a task by ID |
| PUT | /tasks/:id | None | Update a task |
| DELETE | /tasks/:id | None | Delete a task |

> Only `GET /auth/profile` requires a Bearer token. All other endpoints are currently unguarded.

## How to Run

### Prerequisites

- Node.js 20+
- PostgreSQL 16+

### Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd mantys-kanban

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env and fill in your DATABASE_URL and JWT_SECRET

# 4. (For running tests) also create a test env
cp apps/api/.env.example apps/api/.env.test
# Edit apps/api/.env.test with a separate test database

# 5. Run database migrations
cd apps/api
npx prisma migrate dev

# 6. Start the development server
cd ../..
npm run start:dev
```

The API will be available at `http://localhost:3000`.
Swagger UI is available at `http://localhost:3000/api`.

## Environment Variables

Copy `apps/api/.env.example` to `apps/api/.env` and fill in the values:

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://user:pass@localhost:5432/mantys_kanban |
| JWT_SECRET | Secret used to sign JWT tokens | a-long-random-string |
| PORT | Port the server listens on | 3000 |

## Testing

```bash
# Unit tests
npm run test:api

# E2E tests (requires .env.test to be configured)
npm run test:e2e --workspace=apps/api
```
