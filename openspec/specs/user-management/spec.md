# user-management

Current-state spec, synthesized from `openspec/changes/archive/2026-06-14-prisma-schema/` (base CRUD) and `openspec/changes/archive/2026-06-14-auth-jwt/` (password hashing, `findByEmail`). Unmodified since.

## Purpose

CRUD for the `User` resource, and the internal lookup used by authentication.

## Requirements

### Requirement: User CRUD Module

`UsersModule` MUST provide a `UsersService` with create/findAll/findOne/update/remove backed by `PrismaService`, and MUST export `UsersService` (required by `AuthModule`).

- `create()` MUST hash the incoming plaintext password with `bcrypt.hash(password, 10)` before persisting. This is the ONLY hashing choke point — both `POST /users` (direct CRUD) and `POST /auth/register` route through it, so no creation path can store a plaintext password.
- Every read/list response MUST exclude the `password` field (`USER_SELECT` constant / Prisma `select`).
- Duplicate email MUST raise `ConflictException` (409) — mapped from Prisma `P2002`.
- `findOne` on a missing id MUST raise `NotFoundException` (404) — mapped from Prisma `P2025`.

#### Scenario: Password never leaves the service as plaintext

- GIVEN a `CreateUserDto` with a plaintext `password`
- WHEN `UsersService.create()` is called
- THEN the stored `password` column is a bcrypt hash (`$2b$...`)
- AND the returned user object does not include `password`

### Requirement: findByEmail (internal, auth-only)

`UsersService.findByEmail(email)` MUST return the user record INCLUDING the `password` field (no `select`), or `null` if not found. This method exists solely for `AuthService`'s login flow and MUST NOT be called from any controller.

### Requirement: No Auth Guard on User CRUD Routes

As of the latest archived change, `GET/POST/PUT/DELETE /users*` routes are UNGUARDED — no `JwtAuthGuard` is applied. This is documented, known scope (see `user-auth` domain for the one endpoint that IS guarded, `GET /auth/profile`).
