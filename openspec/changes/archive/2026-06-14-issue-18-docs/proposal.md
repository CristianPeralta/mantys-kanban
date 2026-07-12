# Proposal: MANTYS Kanban API Documentation Update (issue-18-docs)

Reconstructed from Engram observations (ids 194, 195), change `issue-18-docs` (GitHub issue #18). Documentation/annotation-only — no endpoint behavior changes.

## Intent

README and Swagger were stale and misrepresented the project: README described a generic "Tasks API" on Node 19 + MongoDB (actual stack is NestJS + PostgreSQL + Prisma + JWT), Swagger's DocumentBuilder still said "Tasks API" and declared only the `Tasks` tag, and every DTO lacked `@ApiProperty` so request body schemas rendered empty. No `.env.example` existed. This change makes the docs reflect the real MANTYS Kanban domain and makes `/api` a usable, complete API reference.

## Scope

### In Scope
- Full README rewrite: MANTYS Kanban branding, real stack, architecture overview, correct data model, run/migrate/test instructions, all endpoint groups.
- `main.ts` DocumentBuilder: title/description → MANTYS Kanban; declare all 4 tags (Auth, Projects, Users, Tasks); keep `addBearerAuth()`.
- `@ApiOperation` + `@ApiResponse` on all 3 AuthController routes.
- `@ApiProperty` on all fields across 7 DTOs.
- Switch the 3 Update DTOs to `PartialType` from `@nestjs/swagger` (was `@nestjs/mapped-types`) for proper schema inheritance.
- Normalize tag casing to PascalCase (`projects`→`Projects`, `users`→`Users`).
- Create `apps/api/.env.example` (DATABASE_URL, JWT_SECRET, PORT).

### Out of Scope
- Mermaid/Prisma ERD diagram (issue marked it optional — deferred).
- Any new API endpoints, guard/authorization behavior changes.

## Approach

Full Swagger + README rewrite. Annotate DTOs and controllers so Swagger UI renders complete request/response schemas, fix DocumentBuilder metadata and tags, rewrite README against the real stack, add `.env.example`. Single PR, low risk.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| PartialType import swap (mapped-types → swagger) breaks validation | Low | `@nestjs/swagger` re-exports with backward compat; run existing tests |
| Auth controller annotation gap missed | Med | Explicit task per route |
| README run instructions unverifiable without `.env.example` | Low | `.env.example` creation is in scope |

## Rollback Plan

Pure docs/annotation change with no runtime behavior. Revert the single PR. No data, schema, or migration impact.

## Success Criteria

- [x] README reflects MANTYS Kanban API (real NestJS/PostgreSQL/Prisma/JWT stack), not generic Tasks API.
- [x] Swagger at `/api` lists all endpoints (Auth, Users, Projects, Tasks) with populated request/response schemas and enum values.
- [x] All tags PascalCase and consistent.
- [x] `apps/api/.env.example` exists and matches README setup steps.
- [x] Existing unit + e2e tests still pass.
