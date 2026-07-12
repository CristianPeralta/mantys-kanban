# user-auth — Delta Spec (change: auth-jwt)

Reconstructed from Engram observation id 165.

## ADDED Requirements

### Requirement: Password Hashing on User Creation

`UsersService.create()` MUST hash the password with bcrypt before persisting the user record. The raw plaintext password MUST NOT be stored in the database. All creation paths (auth registration and direct CRUD) MUST produce a hashed value because hashing lives at the service layer.

#### Scenario: New user created via any path

- GIVEN a `CreateUserDto` with a plaintext `password` field
- WHEN `UsersService.create()` is called
- THEN the stored `password` column contains a bcrypt hash (starts with `$2b$`)
- AND the returned user object MUST NOT include the `password` field (USER_SELECT honored)

#### Scenario: Password field excluded from all responses

- GIVEN an existing user record in the database
- WHEN any endpoint returns a user object
- THEN the response payload MUST NOT contain a `password` field

### Requirement: UsersService Export

`UsersModule` MUST export `UsersService` so that `AuthModule` can inject it without circular dependencies.

#### Scenario: AuthModule resolves UsersService

- GIVEN `AuthModule` imports `UsersModule`
- WHEN the NestJS DI container bootstraps
- THEN `AuthService` receives a valid `UsersService` instance with no runtime error

### Requirement: User Lookup by Email (with password)

`UsersService` MUST expose a `findByEmail(email: string)` method that returns the user record including the `password` field. This method is ONLY intended for internal auth use; it MUST NOT be called from controllers.

#### Scenario: Existing email

- GIVEN a user with `email` exists in the database
- WHEN `findByEmail(email)` is called
- THEN the returned object includes `id`, `email`, and `password`

#### Scenario: Unknown email

- GIVEN no user with `email` exists
- WHEN `findByEmail(email)` is called
- THEN the method returns `null`

### Requirement: POST /auth/register

The endpoint MUST accept `{ email, password, name? }` and create a new user. It MUST return the created user (without `password`) with HTTP 201. Duplicate email MUST return HTTP 409.

#### Scenario: Successful registration

- GIVEN `email` is not already registered
- WHEN `POST /auth/register` is called with valid `{ email, password }`
- THEN the response status is 201
- AND the body contains `id`, `email`, and `name` (no `password`)

#### Scenario: Duplicate email

- GIVEN a user with the same `email` already exists
- WHEN `POST /auth/register` is called
- THEN the response status is 409

#### Scenario: Missing required fields

- GIVEN the request body omits `email` or `password`
- WHEN `POST /auth/register` is called
- THEN the response status is 400

> Note: `POST /auth/register` was later hardened in change `issue-45-auth-register` to force `role: MEMBER` server-side regardless of what the caller sends, closing a privilege-escalation hole. See `openspec/changes/archive/2026-06-14-issue-45-auth-register/`.

### Requirement: POST /auth/login

The endpoint MUST accept `{ email, password }`, verify the credentials, and return `{ accessToken, user }` matching `LoginResponse` from `packages/types`. It MUST return HTTP 401 on wrong credentials.

#### Scenario: Valid credentials

- GIVEN a registered user with a known password
- WHEN `POST /auth/login` is called with correct `{ email, password }`
- THEN the response status is 200
- AND the body matches `{ accessToken: string, user: { id, email, name } }`
- AND `accessToken` is a valid signed JWT

#### Scenario: Wrong password

- GIVEN a registered user
- WHEN `POST /auth/login` is called with the correct email but wrong password
- THEN the response status is 401

#### Scenario: Unknown email

- GIVEN no user with the supplied email exists
- WHEN `POST /auth/login` is called
- THEN the response status is 401

#### Scenario: Missing fields

- GIVEN the request body omits `email` or `password`
- WHEN `POST /auth/login` is called
- THEN the response status is 400

> Note: the initial implementation returned `{ access_token }` (snake_case, no `user` field), diverging from this spec (flagged as verify-report warning W1). It was corrected before archive to return `{ accessToken, user }` per `LoginResponse` — see Engram decision `decision/auth-jwt-complete` (obs #172). This spec reflects the corrected (final, shipped) shape.

### Requirement: JWT Token Format

The JWT issued at login MUST encode an `AuthTokenPayload` from `packages/types`. The secret MUST be sourced from `ConfigService` (env var `JWT_SECRET`). The payload MUST NOT include the password.

#### Scenario: Token payload content

- GIVEN a successful login
- WHEN the returned `accessToken` is decoded
- THEN the payload contains at least `sub` (user id) and `email`
- AND the payload does NOT contain `password`

> Note: as shipped, `JwtStrategy` uses a local inline interface mirroring `AuthTokenPayload` instead of importing it from `@mantys/types`, because that package was not built/linked in the monorepo at the time. Documented tech debt (verify-report W2).

### Requirement: JwtAuthGuard — Reusable Auth Guard

`JwtAuthGuard` MUST extend `AuthGuard('jwt')` and return HTTP 401 when the request lacks a valid Bearer token. It MUST attach the validated user payload to `request.user`. It MUST NOT be applied globally in this change.

#### Scenario: Valid Bearer token

- GIVEN a route protected by `JwtAuthGuard`
- WHEN the request includes a valid `Authorization: Bearer <token>` header
- THEN the handler executes and `request.user` contains the decoded payload

#### Scenario: Missing token

- GIVEN a route protected by `JwtAuthGuard`
- WHEN the request has no `Authorization` header
- THEN the response status is 401

#### Scenario: Invalid or expired token

- GIVEN a route protected by `JwtAuthGuard`
- WHEN the request includes a malformed or expired Bearer token
- THEN the response status is 401

### Requirement: GET /auth/profile — Demonstrator Protected Endpoint

`GET /auth/profile` MUST require a valid JWT (via `JwtAuthGuard`) and return the authenticated user's payload.

#### Scenario: Authenticated request

- GIVEN a valid JWT obtained from `POST /auth/login`
- WHEN `GET /auth/profile` is called with `Authorization: Bearer <token>`
- THEN the response status is 200
- AND the body contains the user payload (no `password`)

#### Scenario: Unauthenticated request

- GIVEN no Authorization header
- WHEN `GET /auth/profile` is called
- THEN the response status is 401

> Note: as of this change, `Tasks`/`Users`/`Projects` routes remain UNGUARDED (public) — only `GET /auth/profile` requires a token. Applying the guard elsewhere was explicitly deferred.
