# web-auth — Delta Spec (change: issue-21-web-auth)

Reconstructed from Engram observation id 236. New capability — the frontend authentication flow in `apps/web`, distinct from the API's `user-auth` domain.

## ADDED Requirements

### Requirement: Login Page Rendering

The system MUST render a `/login` page containing an email input, a password input, and a submit button. Inputs MUST have associated labels and correct `type` attributes (`type="email"`, `type="password"`).

#### Scenario: Login page renders form elements

- GIVEN an unauthenticated user navigates to `/login`
- WHEN the page loads
- THEN an email field, a password field, and a submit button are visible
- AND each field has an associated accessible label

### Requirement: Login Form Submission

The system MUST invoke `loginAction(formData)` when the form is submitted. While the action is in flight the submit button MUST be disabled to prevent duplicate submissions.

### Requirement: loginAction — Success Path

`loginAction` MUST call `POST /auth/login` on the API using `fetch()`. On a `200` response it MUST set the `auth-token` cookie with `httpOnly: true`, `secure: true` only when `NODE_ENV === 'production'`, `sameSite: 'lax'`, `maxAge: 604800` (7 days), `path: '/'`. The `redirect('/board')` call MUST be placed after the try/catch block, not inside it.

#### Scenario: Valid credentials set cookie and redirect

- GIVEN `loginAction` is invoked with correct email and password
- WHEN `POST /auth/login` returns `200` with a JWT
- THEN the `auth-token` httpOnly cookie is set with the specified attributes
- AND the user is redirected to `/board`

#### Scenario: redirect is called outside try/catch

- GIVEN `loginAction` runs successfully
- WHEN `redirect()` is called
- THEN it is NOT wrapped in a try/catch block (Next.js `redirect()` throws internally as a control-flow signal — wrapping it lets `catch` swallow it and silently breaks navigation)

### Requirement: loginAction — Error Path

On a non-`200` response (401, 422, 5xx) or a network/fetch error, `loginAction` MUST return `{ error: string }` with a human-readable message (e.g. "Invalid email or password"). No cookie is set and no redirect occurs.

### Requirement: Login Form Error Display

The login page MUST display the error string returned by `loginAction`, visible without a full reload.

### Requirement: Route Protection Middleware

The middleware MUST intercept all requests EXCEPT `/login`, `/_next/*`, `/favicon.ico`, and static public files. If the `auth-token` cookie is absent, it MUST redirect to `/login`. If present, it MUST allow the request to proceed WITHOUT verifying the JWT signature (trust-on-existence — the NestJS API validates every protected endpoint independently, so edge verification is redundant for security).

#### Scenario: Unauthenticated request to protected route is redirected

- GIVEN no `auth-token` cookie is present
- WHEN a request is made to `/board` (or any protected path)
- THEN the middleware redirects to `/login`

#### Scenario: Login route is excluded from middleware

- GIVEN no `auth-token` cookie is present
- WHEN a request is made to `/login`
- THEN the middleware does NOT redirect (no infinite loop)

### Requirement: Authenticated Redirect on Login Page Visit

If a user with a valid `auth-token` cookie visits `/login`, the middleware MUST redirect them to `/board`.

### Requirement: logoutAction

`logoutAction` MUST clear the `auth-token` cookie and redirect to `/login`.

### Requirement: Logout Trigger on Board Page

The `/board` placeholder page MUST render a logout button or link that invokes `logoutAction`.

### Requirement: Board Placeholder Page

The `/board` route MUST render a minimal page showing "MANTYS Kanban" text and the logout button, protected by middleware.

> Note: this placeholder was superseded by the real Kanban board in change `issue-22-kanban-board` — see `openspec/changes/archive/2026-06-14-issue-22-kanban-board/`.

### Requirement: Root Route Redirect

The root route (`/`) MUST redirect to `/board`; middleware then handles the auth gate (unauthenticated visitors land on `/login` before the root page logic ever executes, avoiding a redundant `/` → `/login` → `/board` double-hop for logged-in users).

### Requirement: Environment Configuration

`apps/web` MUST document `NEXT_PUBLIC_API_URL` in `.env.local.example`. `loginAction` MUST read the API base URL from this variable (falling back to `http://localhost:3000` if unset).

## Non-Goals

- Registration web page
- JWT signature verification in middleware
- Full Kanban board UI (delivered separately in issue #22)
- Field-level API error mapping (a generic message is acceptable)
