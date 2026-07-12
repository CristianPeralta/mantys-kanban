# user-auth

Current-state spec, synthesized from `openspec/changes/archive/2026-06-14-auth-jwt/` (registration, login, JWT, guard) and `2026-06-14-issue-45-auth-register/` (role self-assignment fix + controller test coverage).

This is the API-side auth domain. See `web-auth` for the separate `apps/web` login flow that consumes it.

## Purpose

Credential-based registration and login issuing a JWT, plus a reusable guard for protecting routes.

## Requirements

### Requirement: POST /auth/register

Accepts `{ email, password, name? }`, creates a user via `UsersService.create()` (which hashes the password — see `user-management`), and returns the created user without `password` (HTTP 201). Duplicate email returns 409; missing fields return 400.

`AuthService.register()` MUST force `role: Role.MEMBER` on every request by passing `{ ...dto, role: Role.MEMBER }` to `UsersService.create()`, regardless of any `role` value the caller supplies. This closes a privilege-escalation hole (a caller could otherwise self-assign `OWNER`). The enforcement lives in `AuthService`, not `UsersService.create()` itself, so the underlying create path stays reusable for privileged callers that legitimately need to assign roles.

#### Scenario: Caller supplies role OWNER — receives MEMBER

- GIVEN a `POST /auth/register` request with `{ ..., role: "OWNER" }`
- WHEN the request is processed
- THEN the created user has `role: MEMBER`, not `OWNER`

### Requirement: POST /auth/login

Accepts `{ email, password }`, verifies via `UsersService.findByEmail()` + `bcrypt.compare`, and on success returns `{ accessToken, user }` matching `LoginResponse` from `packages/types` (HTTP 200). Wrong password or unknown email returns 401.

The signed JWT encodes an `AuthTokenPayload`-shaped `{ sub, email, role }`, secret sourced from `ConfigService.get('JWT_SECRET')`.

### Requirement: JwtAuthGuard

`JwtAuthGuard extends AuthGuard('jwt')`, attaches the validated payload to `request.user`, returns 401 on a missing/invalid/expired Bearer token. As of the latest archived change it is applied to exactly two routes: `GET /auth/profile` and `DELETE /projects/:id` (see `project-management`). All other routes (Tasks, Users, Projects reads/writes besides delete) remain unguarded.

### Requirement: GET /auth/profile

Requires a valid JWT; returns the authenticated user's payload (no `password`). 401 without a token.

### Requirement: Auth Controller Test Coverage

`apps/api/src/auth/auth.controller.spec.ts` covers the controller layer with a mocked `AuthService`. Because `register`/`login` are public routes, their specs do not use `overrideGuard(JwtAuthGuard)` — that pattern is reserved for guarded routes.

## Known Tech Debt

- `JwtStrategy` uses a local inline interface mirroring `AuthTokenPayload` instead of importing it from `@mantys/types`, because that package was not built/linked in the monorepo when `auth-jwt` shipped. Not resolved as of the latest archived change — verify whether `issue-20-web-scaffold`'s `packages/types` `main`/`exports` fix (pointing at `src/index.ts`) has since made this importable; not confirmed in the source material.
