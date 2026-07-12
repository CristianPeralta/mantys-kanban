# Tasks: issue-17-tests — Unit & E2E Coverage for Auth and Tasks

Reconstructed from Engram observations id 185 (task plan) and id 186 (apply-progress). All tasks complete.

**Delivery**: single PR, feature-branch-chain, target `feat/auth-jwt` (tracker). ~80 changed lines, Low risk.

## Phase 1: Environment Setup
- [x] 1.1 Confirm local `mantys_kanban_test` DB exists (`createdb` + `prisma db push` if not)
- [x] 1.2 Append `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mantys_kanban_test` to `apps/api/.env.test`, preserving `JWT_SECRET`
- [x] 1.3 Create `apps/api/.env.test.example` with both vars as placeholders

## Phase 2: Unit Test Additions
- [x] 2.1 `auth.service.spec.ts` — `register()` propagates rejection from `usersService.create()`
- [x] 2.2 `tasks.service.spec.ts` — `update()` rethrows non-P2025 errors
- [x] 2.3 `tasks.service.spec.ts` — `remove()` rethrows non-P2025 errors

## Phase 3: E2E Full-Flow Describe Block
- [x] 3.1 Declare `flowUser = { email: 'flow-e2e@example.com', password: 'test123', name: 'Flow E2E' }`
- [x] 3.2 `beforeEach` — `prisma.user.deleteMany({ where: { email: flowUser.email } })`
- [x] 3.3 `afterAll` — same cleanup
- [x] 3.4 `it('should create a task (BACKLOG), move to IN_PROGRESS, then to DONE')` + `it('should have obtained a valid accessToken during login')`

## Phase 4: Documentation
- [x] 4.1 `apps/api/README.md` — "Local E2E Setup" section

## Phase 5: Verification
- [x] 5.1 `npm run test` — 57 tests, 6 suites, GREEN
- [x] 5.2 `npm run test:e2e` — 18 tests, 2 suites, GREEN
- [x] 5.3 Confirmed "Full flow: login → create task → move status" describe label passing

## Git Commits (on `feat/issue-17-tests`, branched from `feat/auth-jwt`)
1. `test(env): add DATABASE_URL to .env.test and .env.test.example` (7a570c0)
2. `test(auth): add register rejection propagation unit test` (1fd85d3)
3. `test(tasks): add non-P2025 rethrow unit tests` (48f460f)
4. `test(tasks): add full flow e2e — login → create task → move status` (63f45d1)
5. `docs(api): add local e2e setup instructions` (09d1cc6)

## Deviations from Design
- E2E test used `beforeEach` for register+login plus two separate `it` blocks, instead of a single `it` — followed explicit task instruction over the design outline.
- `flowUser.password` is `'test123'` (task instruction) vs `'secret123'` (design draft).
