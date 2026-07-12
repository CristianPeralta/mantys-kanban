# Design: POST /auth/register — Security Fix + Controller Test Coverage

Reconstructed from Engram observation id 349.

## Technical Approach

Enforce `role: Role.MEMBER` at the auth service boundary using a single spread-override, then add controller-layer and service-layer test coverage matching existing NestJS testing conventions. The coercion belongs in `AuthService.register()` — not in the DTO and not in `UsersService.create()` — because the auth boundary is the trust boundary for the public registration flow. The DTO must stay permissive so privileged callers (admin-initiated creation) retain the ability to pass an explicit role; the service layer strips it only in the public registration path.

## Architecture Decisions

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Where to coerce role | `AuthService.register()` via `{ ...dto, role: Role.MEMBER }` | (a) `@Transform` on DTO field; (b) enforce in `UsersService.create()` | DTO must stay reusable. `UsersService` is generic — locking it to MEMBER breaks privileged callers. The auth service owns the public registration contract. |
| Role import source | `@prisma/client` (enum `Role`) | String literal `'MEMBER'` | Already used throughout the codebase; type-safe, consistent with Prisma enum usage in guards and JWT payload. |
| Controller test guard handling | No `overrideGuard` — register is unguarded | Mirror `projects.controller.spec.ts` pattern with `overrideGuard` | `AuthController.register` has no `@UseGuards` — overriding a guard that isn't there is noise and false confidence. Contrast with `projects.controller.spec.ts`, which correctly overrides `JwtAuthGuard` because `remove` IS guarded. |
| Service spec assertion update | Change `toHaveBeenCalledWith(dto)` → `toHaveBeenCalledWith({ ...dto, role: Role.MEMBER })` | Add a second parallel test, leave old one | The old assertion WILL fail after the fix; updating it matches the new invariant without duplicating setup. |
| Role-stripping test location | `auth.service.spec.ts` | `auth.controller.spec.ts` | The coercion lives in the service. Testing it at the controller layer would test a mock's behavior, not real logic. |

## Data Flow

```
POST /auth/register
  Body: { email, password, name, role?: 'OWNER' }
        │
        ▼
  AuthController.register(dto: CreateUserDto)
        │  (no guard — public route)
        │  forwards dto as-is
        ▼
  AuthService.register(dto)
        │  strips role: applies { ...dto, role: Role.MEMBER }
        ▼
  UsersService.create({ email, password, name, role: 'MEMBER' })
        │  hashes password, calls prisma.user.create
        ▼
  User record (password excluded in response)
```

Role coercion happens at the service boundary — the controller is a thin pass-through and the DTO remains untouched upstream.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/auth/auth.service.ts` | Modify | Import `Role` from `@prisma/client`; `usersService.create(dto)` → `usersService.create({ ...dto, role: Role.MEMBER })` |
| `apps/api/src/auth/auth.controller.spec.ts` | Create | NestJS Testing module with mock `AuthService` (jest.fn() stubs); no `overrideGuard`; three test cases under `describe('register')` |
| `apps/api/src/auth/auth.service.spec.ts` | Modify | Update `toHaveBeenCalledWith(dto)` → `toHaveBeenCalledWith({ ...dto, role: Role.MEMBER })`; add role-stripping test case |

## Interfaces / Contracts

```ts
// auth.service.ts
import { Role } from '@prisma/client';
// register() delegation changes from:
return this.usersService.create(dto);
// to:
return this.usersService.create({ ...dto, role: Role.MEMBER });
```

```ts
// auth.controller.spec.ts — no overrideGuard (diverges intentionally from projects pattern)
const module = await Test.createTestingModule({
  controllers: [AuthController],
  providers: [{ provide: AuthService, useValue: mockAuthService }],
}).compile();
```

```ts
// auth.service.spec.ts — role enforcement assertion
const dtoWithOwner = { ...dto, role: Role.OWNER };
await service.register(dtoWithOwner);
expect(mockUsersService.create).toHaveBeenCalledWith({ ...dtoWithOwner, role: Role.MEMBER });
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Service unit | `register()` calls `usersService.create` with `role: Role.MEMBER` regardless of input role | Mock `UsersService.create`; assert call args with spread-override |
| Service unit | Pre-existing assertion updated to match new behavior | Modify existing `toHaveBeenCalledWith(dto)` line |
| Controller unit | Success: service returns user, controller returns same object | Mock `AuthService.register` to resolve |
| Controller unit | Conflict: service throws `ConflictException`, propagates from controller | Mock `AuthService.register` to reject |
| Controller unit | Role pass-through: controller forwards dto body as-is | Assert `authService.register` called with the raw body dto |

Integration and E2E tests are out of scope — role enforcement is covered at unit level where it lives.

## Migration / Rollout

No migration required, no schema change, no feature flag. One-line service change + test additions, fully backward-compatible — only the registration path is affected; `UsersService.create()` callers that pass explicit roles are unaffected.
