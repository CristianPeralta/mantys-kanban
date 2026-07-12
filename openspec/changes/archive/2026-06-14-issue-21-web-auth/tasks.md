# Tasks: issue-21-web-auth — Frontend Authentication Flow

Reconstructed from Engram observations id 238 (task plan) and id 243 (apply-progress). All 9 tasks complete, zero deviations from design.

**Delivery**: single PR (~165 changed lines, Low risk).

## Phase 1: Core Auth (Foundation)
- [x] 1.1 Create `apps/web/src/app/actions/auth.ts` — `'use server'`, `LoginState` type, `loginAction(prevState, formData)` (fetch POST /auth/login, set `auth-token` cookie, `success`-flag pattern, `redirect('/board')` AFTER try/catch), `logoutAction` (delete cookie, redirect to `/login`)
- [x] 1.2 Create `apps/web/middleware.ts` at the app root (NOT inside `src/`) — cookie presence check, redirect to `/login` if absent on protected path, redirect to `/board` if present on `/login`; `config.matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)']`

## Phase 2: Pages
- [x] 2.1 Create `apps/web/src/app/login/page.tsx` — `'use client'`, `useFormState`/`useFormStatus` from `react-dom` (NOT React 19's `useActionState`), `SubmitButton` child component, Card with labeled email/password inputs and error display
- [x] 2.2 Create `apps/web/src/app/board/page.tsx` — Server Component, "MANTYS Kanban" heading, placeholder text, `<form action={logoutAction}>` with outline Button
- [x] 2.3 Modify `apps/web/src/app/page.tsx` — `redirect('/login')` → `redirect('/board')`
- [x] 2.4 Verify `apps/web/.env.local.example` has `NEXT_PUBLIC_API_URL=http://localhost:3000` (already present — no change needed)

## Phase 3: Verification
- [x] 3.1 `npx tsc --noEmit` in `apps/web/` — 0 errors
- [x] 3.2 `npm run test` in `apps/api/` — 57/57 pass, 0 regressions
- [x] 3.3 Manual smoke-check: `/` without cookie → `/login`; valid login → `/board`; revisit `/login` while authenticated → `/board`; logout → cookie cleared, lands on `/login`

## Commits
- `bc6a377` feat(web): add server action auth and edge middleware
- `daca003` feat(web): add login/board pages and update root redirect

## Deviations from Design
None — implementation matches design exactly.
