# Proposal: POST /auth/register — Security Fix + Controller Test Coverage

Reconstructed from Engram observations (ids 342, 343), change `issue-45-auth-register` (GitHub issue #45).

## Intent

`POST /auth/register` was already fully implemented at the code level. Two gaps remained:

1. **Security gap**: `AuthService.register()` forwarded the raw DTO to `UsersService.create()`, which spread it directly into `prisma.user.create`. A caller could POST `{ role: "OWNER" }` and self-promote to OWNER on registration — privilege escalation via the open `CreateUserDto.role` field.
2. **Test coverage gap**: `auth.controller.spec.ts` did not exist. The controller layer had no unit tests, inconsistent with `projects.controller.spec.ts`.

In production this endpoint would be used to create real users (OWNER and MEMBER) instead of running the Prisma seed script, so the role self-assignment hole was a real risk.

## Scope

### In Scope
- Force `role: Role.MEMBER` inside `AuthService.register()` via spread-override (`{ ...dto, role: Role.MEMBER }`) — strips any caller-supplied role before delegating to `UsersService.create()`.
- Add `apps/api/src/auth/auth.controller.spec.ts` — controller-layer tests using `Test.createTestingModule` with a mock `AuthService`. `register` is a PUBLIC unguarded route, so NO `overrideGuard(JwtAuthGuard)` is needed (diverges intentionally from `projects.controller.spec.ts`, which tests a guarded route).
- Add a test case in `auth.service.spec.ts` asserting role-stripping behavior.
- Update the existing `auth.service.spec.ts` assertion (`toHaveBeenCalledWith(dto)`) — it breaks once the role is forced; must assert `{ ...dto, role: Role.MEMBER }` instead.

### Out of Scope
- Changes to `CreateUserDto.role` field or DTO validation — DTO must stay reusable for privileged callers (e.g. admin-initiated user creation).
- Email verification, rate limiting, or account activation flow.
- Changes to `UsersService.create()` — the fix belongs at the auth boundary, not the generic users layer.
- Frontend changes.

## Capabilities

### Modified Capabilities
- `user-auth`: security invariant added — registration always produces a MEMBER role; controller behavior now covered by unit tests.

## Approach

1. In `AuthService.register()`, pass `{ ...dto, role: Role.MEMBER }` to `usersService.create()` (add `Role` import). One-line change.
2. Create `auth.controller.spec.ts` with a mock `AuthService` — no guard override. Cover: 201 success response shape, 409 conflict propagation, and the role pass-through assertion (controller forwards body as-is; coercion is owned by the service layer).
3. Extend `auth.service.spec.ts`: add a test asserting that when `CreateUserDto` includes `role: Role.OWNER`, `usersService.create` is called with `role: Role.MEMBER`; fix the pre-existing `toHaveBeenCalledWith(dto)` assertion.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing `auth.service.spec.ts` assertion breaks when role is forced | High | Explicitly in scope — update to `toHaveBeenCalledWith({ ...dto, role: Role.MEMBER })` |
| Reviewer expects the controller to coerce the role | Low | Document layer boundary: coercion is owned by the service; controller test is pass-through |
| `UsersService.create()` callers that legitimately pass a role break silently | Low | Fix scoped only to `AuthService.register()` — other callers unaffected |

## Rollback Plan

Revert `auth.service.ts` change (single line + import). Delete `auth.controller.spec.ts`. Remove the new assertion and restore the original assertion in `auth.service.spec.ts`. No data migration, no schema change.

## Success Criteria

- [x] `POST /auth/register` with `{ role: "OWNER" }` in body always creates a MEMBER — confirmed by service spec
- [x] `auth.controller.spec.ts` exists (no guard override) and all tests pass in CI
- [x] `auth.service.spec.ts` includes role-stripping test and existing assertion updated to pass
- [x] No regression in the rest of the `auth.service.spec.ts` suite
