# web-auth

Current-state spec, synthesized from `openspec/changes/archive/2026-06-14-issue-21-web-auth/`. The frontend authentication flow in `apps/web`, distinct from the API's `user-auth` domain that it consumes.

## Purpose

Login page, session cookie, route protection middleware, and logout for the web app.

## Requirements

### Requirement: Login Page

`/login` renders an email input, a password input, and a submit button (each with an accessible label). Submission invokes `loginAction(formData)`; the submit button is disabled while the action is in flight.

### Requirement: loginAction

Calls `POST /auth/login`. On `200`, sets an `auth-token` cookie: `httpOnly: true`, `secure: true` only when `NODE_ENV === 'production'`, `sameSite: 'lax'`, `maxAge: 604800` (7 days), `path: '/'`, then redirects to `/board`. `redirect()` is called AFTER the try/catch block — Next.js `redirect()` throws internally as a control-flow signal, so calling it inside a try/catch would let `catch` swallow it and silently break navigation.

On a non-200 response or network error, returns `{ error: string }` with a human-readable message; no cookie is set, no redirect occurs. The login page displays this error without a full reload.

### Requirement: Route Protection Middleware

Middleware intercepts all requests EXCEPT `/login`, `/_next/*`, `/favicon.ico`, and static files. Missing `auth-token` cookie → redirect to `/login`. Present → request proceeds WITHOUT verifying the JWT signature at the edge (trust-on-existence: the NestJS API validates every guarded endpoint independently, so edge verification would be redundant). A valid `auth-token` cookie present while visiting `/login` redirects to `/board`.

### Requirement: logoutAction

Clears the `auth-token` cookie and redirects to `/login`. Triggered from a logout button/link on the board page.

### Requirement: Root Route Redirect

`/` redirects to `/board`; the middleware then applies the auth gate, so unauthenticated visitors land on `/login` before any `/board` page logic executes (avoids a redundant `/` → `/login` → `/board` double-hop for logged-in users).

## Non-Goals (as of the latest archived change)

- No registration web page (only the API endpoint exists).
- No JWT signature verification in middleware (trust-on-existence by design).
- No field-level API error mapping on the login form (a generic message is shown).
