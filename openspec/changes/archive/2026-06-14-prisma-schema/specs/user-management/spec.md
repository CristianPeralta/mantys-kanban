# user-management — Delta Spec (change: prisma-schema)

Reconstructed from Engram observation id 111.

## ADDED Requirements

### Requirement: User CRUD Module

The system MUST provide a `UsersModule` with a `UsersService` that supports create, findAll, findOne, update, and delete operations backed by `PrismaService`.

#### Scenario: Create user

- GIVEN a valid CreateUserDto with `email`, `password`, `name`, and `role`
- WHEN `POST /users` is called
- THEN the user is persisted via `prisma.user.create` and the created record is returned

#### Scenario: Duplicate email rejected

- GIVEN a user with email "alice@example.com" already exists
- WHEN `POST /users` is called with the same email
- THEN a 409 Conflict response is returned (P2002 mapped to ConflictException)
- AND no duplicate user is persisted

#### Scenario: Find user by id

- GIVEN a user with id "u1" exists
- WHEN `GET /users/u1` is called
- THEN the user record is returned with the `password` field stripped (via Prisma `select`)

#### Scenario: User not found returns 404

- GIVEN no user with the given id exists
- WHEN `GET /users/:id` is called
- THEN a 404 Not Found response is returned (P2025 mapped to NotFoundException)

> Note: at the time this change shipped, `User.password` was stored as a plain string (no hashing). This was accepted as explicit, time-boxed tech debt — see Engram decision `architecture/auth-password` (obs #117) — with the condition that bcrypt hashing be added immediately in the following change (issue #14, JWT Auth). That happened; see `openspec/changes/archive/2026-06-14-auth-jwt/`.
