# Proposal: auth-jwt — JWT Authentication (issue #14)

Reconstructed from Engram observations (ids 163, 164), change `auth-jwt`.

## Intent

The API had no authentication: any client could read/write all data and passwords were stored in plaintext. This blocked every protected feature and was a security defect. This change adds credential-based registration, JWT-issuing login, bcrypt-hashed passwords, and a reusable guard so future routes can require auth.

## Scope

### In Scope
- Install `@nestjs/passport`, `@nestjs/jwt`, `passport`, `passport-jwt`, `bcrypt` (+ `@types/passport-jwt`, `@types/bcrypt`)
- `AuthModule` importing `JwtModule`, `PassportModule`, `UsersModule`
- `POST /auth/register` — creates user, password hashed via bcrypt
- `POST /auth/login` — verifies credentials, returns `{ accessToken, user }`
- `JwtStrategy` (`validate()` builds request user from `AuthTokenPayload`)
- Reusable `JwtAuthGuard extends AuthGuard('jwt')`
- Move bcrypt hashing into `UsersService.create()`; add `findByEmail()` (password included); export `UsersService`
- `LoginDto`; reuse types from `packages/types`
- Swagger bearer auth (`.addBearerAuth()`); unit tests for AuthService + updated UsersService test

### Out of Scope
- Applying `JwtAuthGuard` globally or to existing Task/User/Project routes (deferred — keeps e2e green)
- Refresh tokens, rotation, token revocation/blacklist
- Role-based authorization guards, password reset, email verification, rate limiting
- Removing/protecting the existing `POST /users` CRUD endpoint

## Capabilities

### New Capabilities
- `user-auth`: registration, login, JWT issuance/validation, bcrypt password hashing, reusable auth guard

## Approach

Canonical NestJS JWT pattern. `AuthModule` imports `UsersModule` and depends on `UsersService`. Hashing lives in `UsersService.create()` so ALL creation paths (auth + existing CRUD) hash consistently and none can bypass it. Login uses `UsersService.findByEmail()` (returns password) + `bcrypt.compare`, then signs a JWT with `AuthTokenPayload`. `JwtModule` reads `JWT_SECRET` via `ConfigService`, never `process.env` directly. The guard is built and exported but only wired to one demonstrator route (`GET /auth/profile`) in this slice.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `UsersService.create()` test breaks after hashing | High | Update spec to assert hashed value, not raw dto |
| Hashing in AuthService would let `POST /users` store plaintext | Med | Hash in service layer (`create()`), not controller/AuthService |
| `JWT_SECRET` missing in `.env`/`.env.test` | Med | Add to both files; read via ConfigService |
| Future guard application breaks auth-unaware e2e | Low | Guard not wired to existing routes this slice |
| `UsersModule` doesn't export `UsersService` | High | Add `exports: [UsersService]` |

## Rollback Plan

Revert the feature branch / PR. New files (`src/auth/*`, `login.dto.ts`) removed wholesale. UsersService/UsersModule edits and `app.module.ts`/`main.ts` registrations revert via git. Uninstall added packages. No DB migration involved.

## Success Criteria

- [x] `POST /auth/register` creates a user with a bcrypt hash (never plaintext)
- [x] `POST /auth/login` returns a valid signed JWT
- [x] A route protected by `JwtAuthGuard` returns 401 without/with invalid token
- [x] Passwords never appear in any API response (`USER_SELECT` honored)
- [x] AuthService unit tests and updated UsersService tests pass
