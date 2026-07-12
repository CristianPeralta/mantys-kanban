# Tasks: auth-jwt — JWT Authentication (issue #14)

Reconstructed from Engram observations id 167 (task plan) and id 168 (apply-progress). All implementation tasks complete.

## Delivery Strategy
- Strategy: auto-chain / feature-branch-chain
- Tracker branch: `feat/auth-jwt` (accumulates all slices; only this merges to main)
- Strict TDD: ENABLED — test runner: `npm run test:api`
- Estimated total changed lines: ~564 (400-line budget risk: High → chained PRs)

## Chain Map

| Slice | Branch | Target | PR | Est. Lines |
|-------|--------|--------|----|------------|
| 1 | `feat/auth-jwt-s1-users-foundation` | `feat/auth-jwt` | #31 | ~185 |
| 2 | `feat/auth-jwt-s2-auth-module` | `feat/auth-jwt-s1-users-foundation` | #32 | ~380 |

Tracker `feat/auth-jwt` merged to `main` via **PR #33**.

## Slice 1 — Users Foundation — [x] DONE
**Branch**: `feat/auth-jwt-s1-users-foundation` → PR #31 → `feat/auth-jwt`

- [x] 1.1 Create tracker branch `feat/auth-jwt` (off main) and slice branch off it
- [x] 1.2 Install `@nestjs/passport@10.0.3`, `@nestjs/jwt@10.2.0`, `passport`, `passport-jwt`, `bcrypt` (+ `@types/passport-jwt`, `@types/bcrypt` dev)
- [~] 1.3 Add `JWT_SECRET` to `.env`/`.env.test` — BLOCKED by tool permissions on gitignored files; developer created them manually
- [x] 1.4 [TEST] Write failing unit tests for UsersService changes (RED: `findByEmail` didn't exist)
- [x] 1.5 [IMPL] `UsersService.create()` hashes via `bcrypt.hash(pwd, 10)`; add `findByEmail(email)` (no `select`, includes password) — 47 tests GREEN
- [x] 1.6 [IMPL] `exports: [UsersService]` added to `UsersModule`
- [x] 1.7 Open PR #31

## Slice 2 — Auth Module — [x] DONE
**Branch**: `feat/auth-jwt-s2-auth-module` → PR #32 → `feat/auth-jwt-s1-users-foundation`

- [x] 2.1 Create Slice 2 branch off Slice 1
- [x] 2.2 [TEST] Write failing AuthService unit tests (RED: AuthService/LoginDto didn't exist)
- [x] 2.3 [IMPL] Create `LoginDto` (email + password, MinLength 6)
- [x] 2.4 [IMPL] Create `JwtStrategy`
- [x] 2.5 [IMPL] Create `JwtAuthGuard`
- [x] 2.6 [IMPL] Create `AuthService` (register/validateUser/login)
- [x] 2.7 [IMPL] Create `AuthController` (register/login/profile)
- [x] 2.8 [IMPL] Create `AuthModule`
- [x] 2.9 [IMPL] Register `AuthModule` in `AppModule` + `.addBearerAuth()` in `main.ts`
- [x] 2.10 [TEST] Write e2e tests (`apps/api/test/auth.e2e-spec.ts`, 10 tests)
- [x] 2.11 [VERIFY] Full suite: 54 unit tests, 6 suites — all GREEN
- [x] 2.12 Open PR #32
- [x] 2.13 Merge sequence — PR #31 → feat/auth-jwt, PR #32 retargeted and merged → feat/auth-jwt, tracker `feat/auth-jwt` → `main` via PR #33

## Post-verify fix (before archive)

Not in the original task list — added after `sdd-verify` flagged W1 (login response shape):
- [x] `auth.service.ts` `login()` changed from `{ access_token }` (snake_case) to `{ accessToken, user }` matching `LoginResponse` from `packages/types`
