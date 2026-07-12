# Tasks: POST /auth/register — Role Enforcement + Controller Test Coverage

Reconstructed from Engram observations id 354 (task plan) and id 358 (apply-progress). All tasks complete.

**Delivery**: single PR, ~66 changed lines (Low risk). Strict TDD (RED → GREEN).

## Phase 1: RED — Write / Update Failing Tests First
- [x] 1.1 `auth.service.spec.ts` — update existing `toHaveBeenCalledWith(dto)` assertion to `toHaveBeenCalledWith({ ...dto, role: Role.MEMBER })`; add `import { Role } from '@prisma/client'`. Confirmed FAIL before the fix.
- [x] 1.2 `auth.service.spec.ts` — add new test: DTO with `role: Role.OWNER` asserts `mockUsersService.create` called with `{ ...dto, role: Role.MEMBER }`. Confirmed FAIL before the fix.
- [x] 1.3 Create `auth.controller.spec.ts` — `Test.createTestingModule`, mock `AuthService`, NO `overrideGuard`. Three cases under `describe('AuthController > register')`: success → 201; conflict → propagates; dto forwarded as-is.

## Phase 2: GREEN — Implement the Fix
- [x] 2.1 `auth.service.ts` — add `import { Role } from '@prisma/client'`; change `register()` body to `return this.usersService.create({ ...dto, role: Role.MEMBER })`. Committed atomically with 1.1/1.2.
- [x] 2.2 `cd apps/api && pnpm test` — all `auth.service.spec.ts` and `auth.controller.spec.ts` tests pass (13/13 auth tests green).

## Phase 3: Verify Full Suite
- [x] 3.1 Full suite from repo root — 66/66, no regressions.

## TDD Cycle Evidence

| Task | RED | GREEN |
|------|-----|-------|
| 1.1 Update existing assertion | FAIL before fix | PASS after `auth.service.ts` fix |
| 1.2 New role-stripping test | FAIL — service forwarded raw dto with role: OWNER | PASS after fix |
| 1.3 Controller spec (3 cases) | PASS immediately — controller is a thin pass-through | PASS |
| 2.1 Fix `auth.service.ts` | atomic with 1.1/1.2 | PASS — all 13 auth tests green |

## Commit
`c96ba4a` — `feat(auth): enforce MEMBER role on registration + add controller and service specs`

## Deviations from Design
None — implementation matches design exactly.
