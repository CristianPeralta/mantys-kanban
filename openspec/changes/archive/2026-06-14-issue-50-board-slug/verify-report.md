# Verification Report: issue-50-board-slug

Reconstructed from Engram observations id 449 (verify-report) and id 450 (archive-report).

**Verdict at verify time**: PASS WITH WARNINGS. **Final verdict after apply-phase fix**: PASS.

## Completeness Table

| Phase | Tasks | Status |
|-------|-------|--------|
| 1. Prisma Schema + Migration | 1.1–1.3 | All checked |
| 2. API Service Layer | 2.1–2.5 | All checked |
| 3. API Controller | 3.1–3.3 | All checked |
| 4. Shared Types | 4.1 | Checked |
| 5. Frontend Routes | 5.1–5.3 | All checked |

## Build / Tests Evidence

| Suite | Result |
|-------|--------|
| `npm test --runInBand` (apps/api) | 80/80 PASS — 8 suites |
| Web TypeScript | clean (no test suite exists for web) |
| API TypeScript | clean |

## Spec Compliance Matrix (selected)

All scenarios from `specs/project-management/spec.md` PASS, with one exception at verify time:

| Requirement | Scenario | Status | Evidence |
|---|---|---|---|
| Slug-based Lookup Endpoint | Route not shadowed by `:id` | PASS | `@Get('by-slug/:slug')` declared before `@Get(':id')` |
| Slug Backfill for Existing Rows | Migration on non-empty DB | PASS | 4-step migration SQL, no `unaccent` |
| **Legacy Query-Param Redirect** | **Legacy URL is redirected** | **WARNING → fixed** | see W1 below |
| Sidebar Navigation Uses Slug | link + active state by slug | PASS | |

## Issues

### WARNING (at verify time)

**W1 — Legacy redirect used 307 instead of 301**
- `apps/web/src/app/board/page.tsx`: `redirect(...)` (Next.js `next/navigation`) emits HTTP 307 (Temporary), not the spec-required 301.
- **Fixed before archive**: switched to `permanentRedirect(...)` from `next/navigation`, which Next.js maps to a 308 permanent redirect (the framework's permanent-redirect primitive). Confirmed in archive-report (obs #450): "W1 fixed by switching to `permanentRedirect()` ... implementation now correctly returns [a permanent redirect] as per spec."

### SUGGESTIONS (non-blocking, left for future work)

**S1 — `findOne()` does not throw NotFoundException on null**
- Pre-existing inconsistency in `projects.service.ts`/`projects.controller.ts`, not introduced by this change, but now inconsistent with the new `findBySlug()` (which does throw).

**S2 — No E2E/integration tests for the new `/board/[slug]` web route**
- Web layer has no automated test runner; slug route behavior verified only via source inspection and TypeScript compilation.

## Design Coherence

Note: the verify-report text itself states "No design document was produced for this change (tasks + spec only)" — this is a discrepancy in the source Engram data; a full design observation (`sdd/issue-50-board-slug/design`, id 443) does exist and was used to reconstruct `design.md`.

## Final Verdict

PASS WITH WARNINGS at verify time (0 CRITICAL, 1 WARNING, 2 SUGGESTIONS) → **PASS** after W1 was fixed during apply/before archive. All 80 API unit tests pass; all spec scenarios covered.
