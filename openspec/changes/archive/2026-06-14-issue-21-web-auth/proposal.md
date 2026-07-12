# Proposal: issue-21-web-auth — Frontend Authentication Flow

Reconstructed from Engram observations (ids 234, 235), change `issue-21-web-auth` (GitHub issue #21).

## Intent

The web app (`apps/web`) had no way for users to authenticate. `src/app/page.tsx` blindly redirected to a `/login` route that did not exist, and no mechanism protected routes or persisted a session. The NestJS API already exposed `POST /auth/login` returning a 7-day JWT, but the frontend could not consume it. This change closes that gap: real login, an httpOnly session cookie, route protection, and logout — the entry gate for every future authenticated feature (board, issue #22 onward).

## Scope

### In Scope
- `/login` page: email + password form
- Server Action calling `POST /auth/login`, storing JWT in an httpOnly cookie
- Middleware redirecting unauthenticated users to `/login`
- Logout Server Action that clears the cookie and redirects to `/login`
- `.env.local.example` documenting `NEXT_PUBLIC_API_URL`

### Out of Scope
- Registration web UI (API supports it; issue does not require it)
- Cryptographic JWT verification in middleware (trust-on-existence; API is the real firewall)
- Board/dashboard page (issue #22)
- Client-side auth interceptor / `withCredentials` CORS wiring (needed only when board fetches data)

## Capabilities

### New Capabilities
- `web-auth`: login page, session cookie lifecycle, route-protection middleware, and logout for the Next.js app.

## Approach

Server Action + trust-on-existence middleware (chosen over a Next.js Route Handler and over client-side localStorage, which was disqualified by the httpOnly requirement). Login form (Client Component, controlled inputs) invokes a `'use server'` action that `fetch()`s the API, then `cookies().set('auth-token', accessToken, …)` and `redirect('/board')`. Logout action deletes the cookie. Middleware reads `request.cookies.get('auth-token')`; absent on a protected path → redirect to `/login`. No new packages — `fetch()` (not axios) is used in actions for edge-safety.

Cookie: `auth-token`, `httpOnly`, `secure` only in production, `sameSite: 'lax'`, `maxAge` 7d, `path: '/'`.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `redirect()` inside try/catch throws | High | Call AFTER try/catch |
| Middleware matcher infinite loop | Med | Exclude `/login`, `/_next/`, static |
| `secure: true` blocks dev cookie | Med | Gate on `NODE_ENV==='production'` |

## Rollback Plan

Delete the 4 new files and revert `page.tsx`. No DB, no migrations, no shared-package changes — fully reversible by removing untracked files.

## Success Criteria

- [x] Valid login sets cookie and redirects to the board entry route
- [x] Protected route without token redirects to `/login`
- [x] Logout clears cookie and redirects to `/login`
