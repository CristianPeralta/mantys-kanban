# Verification Report: issue-44-owner-delete-project

Reconstructed from Engram observations id 320 (verify-report) and id 321 (archive-report). Verdict: PASS WITH WARNINGS.

## Build / Test Evidence

| Check | Result |
|-------|--------|
| `cd apps/api && pnpm test` | 61/61 PASS — all 7 suites green |
| `cd apps/web && npx tsc --noEmit` | Exit 0 — no type errors |
| `rg 'Role\.ADMIN' users.service.spec.ts` | No matches — clean |

## Spec Compliance

10/10 requirements satisfied:
- DELETE requires authentication (`JwtAuthGuard`) — PASS
- DELETE restricted to OWNER, MEMBER → 403 (unit-tested) — PASS
- OWNER → 204 (unit-tested) — PASS
- API is the authoritative gate (same inline check covers UI-routed and direct calls) — PASS
- Server action reads cookie + forwards Bearer — PASS (code inspection only, no dedicated test — see W1)
- Delete button hidden for non-OWNER — PASS (code inspection only — see W2)
- Role propagated `BoardPage → Sidebar → ProjectModal` — PASS
- `Role.ADMIN` absent from fixtures — PASS
- All 4 design ADRs satisfied — PASS

## Issues

### CRITICAL
None.

### WARNING

**W1** — No unit/integration tests for `deleteProjectAction` (`apps/web/src/app/actions/projects.ts`). Spec scenarios "Server action forwards cookie to API" and "OWNER deletes via UI" verified by code inspection only.

**W2** — No component tests for `ProjectModal.tsx` delete-button visibility gating. "MEMBER button absent" / "OWNER button present" rely on code inspection only. A Vitest + RTL test would close this gap (no such test infra existed for `apps/web` at this point in the project).

**W3** — Phase 6 manual smoke tasks (6.2–6.4) are unchecked in the task artifact — they require human execution outside CI, not a functional gap.

### SUGGESTION

**S1** — No dedicated test asserts 401 for a missing JWT on `DELETE /projects/:id` (covered functionally by `JwtAuthGuard` behavior, not by an explicit test).

**S2** — `ProjectModal.tsx` still makes direct client `fetch()` calls for create/update (unchanged, out of scope). This creates an asymmetry with the cookie-based delete flow — noted for a future auth-hardening pass.

## Final Verdict

PASS WITH WARNINGS. Warnings are web-layer test-coverage gaps (no CRITICAL issues). All API-side requirements are covered by passing unit tests; TypeScript is clean; no `Role.ADMIN` references remain.
