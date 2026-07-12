# user-auth — Delta Spec (change: issue-45-auth-register)

Reconstructed from Engram observation id 348. This MODIFIES the `POST /auth/register` requirement introduced in `openspec/changes/archive/2026-06-14-auth-jwt/specs/user-auth/spec.md`.

## MODIFIED Requirements

### Requirement: POST /auth/register

The endpoint MUST accept `{ email, password, name? }` and create a new user. It MUST return the created user (without `password`) with HTTP 201. Duplicate email MUST return HTTP 409.

`AuthService.register()` MUST force `role: Role.MEMBER` for every registration request, regardless of any `role` field supplied in the incoming DTO. The implementation MUST pass `{ ...dto, role: Role.MEMBER }` (not the raw `dto`) to `UsersService.create()`. `UsersService.create()` MUST remain unchanged — the enforcement boundary is `AuthService`, not the generic users layer, because the DTO must stay reusable for privileged callers (e.g. admin-initiated user creation) that legitimately need to assign a role.

(Previously: `AuthService.register()` forwarded the raw DTO to `UsersService.create()` with no role override, allowing any caller to self-assign `role: OWNER` on public registration — a privilege-escalation hole.)

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

#### Scenario: Caller omits role — receives MEMBER

- GIVEN a POST /auth/register request with a valid body and no `role` field
- WHEN `AuthService.register()` processes the request
- THEN `UsersService.create()` is called with `role: Role.MEMBER`
- AND the created user has `role: MEMBER`

#### Scenario: Caller supplies role OWNER — receives MEMBER

- GIVEN a POST /auth/register request with `{ ..., role: "OWNER" }` in the body
- WHEN `AuthService.register()` processes the request
- THEN `UsersService.create()` is called with `role: Role.MEMBER` (not OWNER)
- AND the HTTP response status is 201
- AND the response body does NOT reflect `role: OWNER`

#### Scenario: Email already registered — conflict propagated

- GIVEN a POST /auth/register request for an email that already exists
- WHEN `UsersService.create()` throws a `ConflictException`
- THEN `AuthService.register()` MUST NOT swallow the exception
- AND the HTTP response status is 409

## ADDED Requirements

### Requirement: Auth Controller Unit Tests

`apps/api/src/auth/auth.controller.spec.ts` MUST exist and cover the controller layer using `Test.createTestingModule` with a mock `AuthService`. Because `POST /auth/register` is a public (unguarded) route, the spec MUST NOT use `overrideGuard(JwtAuthGuard)` — that pattern is reserved for guarded routes such as `ProjectsController.remove`.

#### Scenario: Successful registration returns 201 with no password

- GIVEN a mock `AuthService.register()` returns a user object (without `password`)
- WHEN POST /auth/register is called with valid credentials
- THEN the controller returns the mock result
- AND the response does NOT include a `password` field

#### Scenario: Conflict exception propagates to HTTP 409

- GIVEN a mock `AuthService.register()` throws `ConflictException`
- WHEN POST /auth/register is called with a duplicate email
- THEN the controller lets the exception propagate (NestJS converts it to 409)

#### Scenario: Controller forwards DTO as-is to service

- GIVEN any valid registration DTO (including one with `role: Role.OWNER`)
- WHEN the controller calls `authService.register(dto)`
- THEN the mock is called with exactly the raw DTO body
- AND role coercion is NOT asserted at the controller layer (it is owned by the service)
