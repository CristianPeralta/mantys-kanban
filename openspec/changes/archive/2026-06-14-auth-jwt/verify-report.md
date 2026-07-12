# Verification Report: auth-jwt

Reconstructed from Engram observations id 169 (verify-report) and id 171 (archive-report).

## Mode
Strict TDD | Branch: feat/auth-jwt-s2-auth-module

## Test Evidence

### Unit Tests (`npm run test:api`)
```
Test Suites: 6 passed, 6 total
Tests:       54 passed, 54 total
Time:        1.678s
```

### E2E Tests
Not run live in the verify pass (require a live PostgreSQL instance). 10 e2e tests exist in `apps/api/test/auth.e2e-spec.ts` and were confirmed GREEN during apply.

## Spec Compliance Matrix

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| 1 | Password hashing in UsersService.create() with bcrypt | PASS | bcrypt.hash(dto.password, 10); unit test confirms compareSync |
| 2 | findByEmail returns user WITH password field | PASS | findUnique without select; unit test confirms |
| 3 | UsersService exported from UsersModule | PASS | `exports: [UsersService]` |
| 4 | POST /auth/register: 201, no password in response | PASS | e2e verifies 201 and password undefined |
| 5 | POST /auth/login: `{ accessToken, user }`, 200 | PASS (after post-verify fix) / WARNING at verify time | see W1 below |
| 6 | GET /auth/profile: 401 without token, 200 with valid | PASS | e2e covers 3 scenarios |
| 7 | JwtAuthGuard extends AuthGuard('jwt') | PASS | |
| 8 | JwtStrategy reads JWT_SECRET from ConfigService | PASS | |
| 9 | AuthModule: imports UsersModule, PassportModule, JwtModule.registerAsync | PASS | |
| 10 | JWT payload: sub, email, role | PASS | confirmed by unit test |
| 11 | Unit tests: AuthService + UsersService | PASS | 7 AuthService + 13 UsersService tests |
| 12 | E2E tests: register/login/profile | PASS (code) | not run live in this pass |
| 13 | packages/types AuthTokenPayload/LoginResponse used | WARNING | see W2 below |

## Issues

### WARNINGS (at verify time)

**W1 — Login response shape deviated from spec / LoginResponse type**
- Implementation returned `{ access_token }` (snake_case, no `user` field) instead of `{ accessToken, user }`.
- **Resolved before archive**: `auth.service.ts` was fixed post-verify to return `{ accessToken, user }` matching `LoginResponse` from `packages/types` (see Engram decision `decision/auth-jwt-complete`, obs #172).

**W2 — @mantys/types not linked in the monorepo**
- `JwtStrategy` uses a local `JwtPayload` interface instead of importing `AuthTokenPayload` from `@mantys/types` (package not built/linked). Shapes match; documented as tech debt, not resolved in this change.

### SUGGESTIONS

**S1 — E2E tests not run live in verify pass**
- Require live PostgreSQL; confirmed GREEN during apply. Recommend a CI e2e gate before future merges — not implemented in this change (later addressed by the deploy/CI work in `issue-24-deploy-vps`).

## Verdict

PASS WITH WARNINGS at verify time (54/54 unit tests GREEN). W1 was fixed before archive; W2 remains open tech debt.

## Tech Debt Carried Forward
1. `@mantys/types` not built/linked in the monorepo — auth code uses local interface mirrors.
2. Existing dev-DB users with plaintext passwords cannot log in post-change (bcrypt.compare rejects them) — re-seed if needed.
3. `Tasks`/`Users`/`Projects` routes remain unguarded (public) — only `GET /auth/profile` requires a token in this change.
