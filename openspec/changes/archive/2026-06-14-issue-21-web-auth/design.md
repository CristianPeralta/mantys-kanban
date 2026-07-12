# Design: issue-21-web-auth — Frontend Authentication Flow

Reconstructed from Engram observation id 237.

## Executive Summary

Server Action + trust-on-existence middleware auth for the Next.js 14 (React 18) web app: a Client-Component login form posts to a `'use server'` action that `fetch()`es `POST /auth/login`, stores the JWT in an httpOnly `auth-token` cookie, and redirects to `/board`. Edge middleware gates every non-public path on cookie presence; logout deletes the cookie.

## Verified Environment Facts (load-bearing)

- `apps/web/package.json`: react 18.3.1 / react-dom 18.3.1 / next 14.2.5 → `useActionState` (React 19) is NOT available. Must use `useFormState` + `useFormStatus` from `react-dom`.
- `@mantys/types` `LoginResponse` = `{ accessToken: string; user: User }` — camelCase `accessToken` (not `access_token`).
- Existing `src/app/page.tsx` did `redirect('/login')` — changed to `redirect('/board')` so the post-login entry is clean (middleware then governs).
- `src/lib/api.ts` uses axios for client calls; actions deliberately use `fetch()` (edge-safe, no axios in a server action).

## Architecture

- **Pattern**: Server Actions for mutations (login/logout) + Edge Middleware for route protection. No client-side token handling, no localStorage — the JWT lives only in an httpOnly cookie the browser cannot read.
- **Trust-on-existence**: middleware checks cookie *presence* only; it does NOT verify the JWT signature. The NestJS API remains the real authorization firewall.
- **Data flow (login)**: form submit → `loginAction(prevState, formData)` → `fetch POST /auth/login` → on 200 `cookies().set('auth-token', accessToken, …)` then `redirect('/board')` OUTSIDE try/catch → middleware sees cookie on next request, allows `/board`.
- **Data flow (protect)**: request → middleware reads `auth-token` → absent on protected path ⇒ `redirect('/login')`; present on `/login` ⇒ `redirect('/board')`.
- **Data flow (logout)**: `logoutAction` → `cookies().delete('auth-token')` → `redirect('/login')`.

## Cookie Contract

`auth-token`, `httpOnly: true`, `secure: NODE_ENV==='production'`, `sameSite: 'lax'`, `maxAge: 60*60*24*7` (7d), `path: '/'`.

## Files

| File | Action | Description |
|---|---|---|
| `apps/web/src/app/actions/auth.ts` | Create | `loginAction(prevState, formData)`, `logoutAction()` |
| `apps/web/src/app/login/page.tsx` | Create | Client component, `useFormState` + `SubmitButton` child using `useFormStatus` |
| `apps/web/middleware.ts` | Create | At app root (NOT `src/`) — Next.js does not detect middleware from `src/` |
| `apps/web/src/app/board/page.tsx` | Create | Server component placeholder with logout form |
| `apps/web/src/app/page.tsx` | Modify | `redirect('/login')` → `redirect('/board')` |
| `apps/web/.env.local.example` | Create | `NEXT_PUBLIC_API_URL=http://localhost:3000` |

## useFormState vs useActionState

React 18.3.1 has no `useActionState` (added in React 19). `useFormStatus()` only reflects the enclosing form, so it must live in a child component (`SubmitButton`) rendered INSIDE `<form>` — calling it in the parent (a sibling of the form) always reads `pending: false`. When the app later upgrades to React 19, both hooks can collapse into a single `useActionState` returning `[state, action, isPending]`.

## Middleware Matcher

`matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)']` — negative lookahead excludes Next internal/static assets so middleware doesn't run on them (perf + avoids redirecting asset requests), while still running on `/`, `/login`, `/board`, and any future app route.

## Redirect Loop Prevention

The two redirect conditions are mutually exclusive (one requires `!token`, the other requires `token`), so a single request can never satisfy both — no infinite loop.

## Architecture Decisions (ADRs)

| ADR | Decision | Rejected | Rationale |
|---|---|---|---|
| ADR-1 | `fetch()` over axios in Server Actions | axios `api.ts` client | Edge-safe, zero extra bundle in the server action; axios stays for future client-side board calls |
| ADR-2 | Trust-on-existence middleware | `jose` JWT verification in middleware | API validates every protected request already; edge verification is redundant for security, adds surface + a duplicated secret |
| ADR-3 | `redirect()` outside try/catch | `redirect()` inside try/catch | `redirect()` throws a `NEXT_REDIRECT` signal; a `catch` would swallow it and silently break navigation. A `success` flag gates the post-block redirect |
| ADR-4 | httpOnly cookie, no localStorage | localStorage token storage | JWT in httpOnly cookie is unreadable by JS (XSS-resistant) and auto-sent by the browser |

## Testing Strategy

No automated web tests exist at this point in the project (`apps/web`'s `test` script is a stub) — verification is TypeScript-compile + manual smoke check, not a test-runner gate.

## Risks / Open Items Carried into Apply

- `useFormStatus` placement is the most likely implementation slip (must be a child inside the form).
- API 401 error body is not parsed field-by-field — a generic message is surfaced (acceptable for this slice).
- CORS/`withCredentials` not wired — fine because login goes through the Server Action (server-to-server), relevant only when the board later fetches from the client (issue #22).
