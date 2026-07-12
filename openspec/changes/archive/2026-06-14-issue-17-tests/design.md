# Design: issue-17-tests — Unit & E2E Coverage for Auth and Tasks

Reconstructed from Engram observation id 183.

## Technical Approach

Pure test/config hardening, no production code touched. Fix local e2e DB connectivity via `.env.test`, add the required full-flow e2e as a new `describe` block in `tasks.e2e-spec.ts`, and backfill two minor unit rethrow/propagation paths. Follows existing test conventions (supertest + AppModule bootstrap, `deleteMany` cleanup, scoped user email).

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|----------|--------|----------|-----------|
| Local e2e DB fix | Append `DATABASE_URL` to `.env.test` | jest globalSetup dotenv load; docker-compose test DB | Already loaded by ConfigModule under NODE_ENV=test; zero code change; mirrors CI |
| Propagate fix to devs | Add `.env.test.example` (committed) + README note | Un-gitignore `.env.test` | `.env.test` stays per-dev secrets; `.example` is the discoverable contract |
| Full-flow test placement | New `describe` inside existing `TasksController (e2e)` suite | Separate spec file | Reuses AppModule/prisma bootstrap and outer cleanup |
| Test user seeding | Via `POST /auth/register` + `POST /auth/login` | `prisma.user.create` with bcrypt hash directly | Exercises the real flow per issue intent |
| Token usage in task requests | Login performed but token NOT sent on `/tasks` requests | Send Bearer on `/tasks` | Tasks routes have no `JwtAuthGuard`; sending a token would misrepresent enforcement |

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/.env.test` | Modify | Append `DATABASE_URL` (gitignored) |
| `apps/api/.env.test.example` | Create | Committed template with JWT_SECRET + DATABASE_URL placeholders |
| `apps/api/test/tasks.e2e-spec.ts` | Modify | Add full-flow describe block + scoped test-user cleanup |
| `apps/api/src/auth/auth.service.spec.ts` | Modify | Add `register` rejection-propagation test |
| `apps/api/src/tasks/tasks.service.spec.ts` | Modify | Add non-P2025 rethrow tests for `update` and `remove` |
| `apps/api/README.md` | Create | Local E2E Setup section |

## Test Isolation Strategy

- Outer `beforeEach` already wipes tasks + projects and recreates `projectId`.
- New block's own `beforeEach`/`afterAll` calls `prisma.user.deleteMany({ where: { email: flowUser.email } })` — mirrors `auth.e2e-spec.ts`. Distinct email (`flow-e2e@`) avoids clashing with `auth-e2e@`.

## Migration / Rollout

No migration. Revert by removing the `DATABASE_URL` line, deleting `.env.test.example`, and reverting spec edits.
