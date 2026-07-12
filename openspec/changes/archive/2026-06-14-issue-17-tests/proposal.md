# Proposal: issue-17-tests — Unit & E2E Coverage for Auth and Tasks

Reconstructed from Engram observations (ids 179, 181), change `issue-17-tests` (GitHub issue #17). No production code was modified by this change — test, config, and docs only.

## Intent

Issue #17 required `npm run test` AND `npm run test:e2e` to pass cleanly, with minimum coverage on AuthService and TasksService and a full "login → create task → move status" e2e flow. Unit tests already passed (54), but e2e FAILED locally because `.env.test` lacked `DATABASE_URL`, and the required status-transition flow was not tested.

## Scope

### In Scope
- Add `DATABASE_URL` to `apps/api/.env.test` so local e2e connects to the test DB (mirrors CI credentials).
- Add an e2e `describe` block in `tasks.e2e-spec.ts`: register + login → create task → PUT status `IN_PROGRESS` → assert response, then `DONE`.
- Backfill AuthService `register` rejection-propagation test and TasksService non-P2025 rethrow tests (`update`/`remove`).
- Document the local test-DB prerequisite.

### Out of Scope
- Adding `JwtAuthGuard` to TasksController (tasks routes stay unprotected; the e2e login step is demonstrative, not enforced).
- Additional status transitions beyond IN_PROGRESS/DONE; 404 cases for tasks.
- docker-compose test-DB orchestration; jest globalSetup env loading.

## Approach

1. Append `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mantys_kanban_test` to `.env.test` (already loaded by ConfigModule under `NODE_ENV=test`).
2. New full-flow e2e in `tasks.e2e-spec.ts` covering the issue's exact scenario, with user cleanup like `auth.e2e-spec.ts`.
3. Backfill the two minor unit rethrow/propagation paths (no coverage gate required them, but they close documented branch gaps).

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `.env.test` is gitignored — fix won't reach other devs | High | Commit `.env.test.example` + document setup in README |
| Local test DB missing/not migrated | Med | Document `createdb` + `prisma db push` prereq |
| New login step leaves orphan test users | Med | Add `deleteMany` cleanup mirroring auth.e2e, distinct scoped email |

## Rollback Plan

Revert `tasks.e2e-spec.ts` and spec edits; remove the `DATABASE_URL` line from `.env.test`; delete `.env.test.example` and `README.md`. No production code or schema touched.

## Success Criteria

- [x] `npm run test` passes with no errors.
- [x] `npm run test:e2e` passes locally and in CI.
- [x] An e2e test asserts a task moves BACKLOG → IN_PROGRESS → DONE via login→create→update flow.
