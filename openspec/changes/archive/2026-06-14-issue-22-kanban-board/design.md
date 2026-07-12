# Design: Kanban Board Main View (Issue #22)

Reconstructed from Engram observation id 259.

## Technical Approach

Approach A: Server Component shell + client DnD island. `board/page.tsx` is an async Server Component that reads the `auth-token` httpOnly cookie, fetches `/tasks` and `/projects` from NestJS in parallel with a Bearer header, and passes initial data as props. The `'use client'` `KanbanBoard` owns mutable optimistic state seeded from props and persists status changes via `PUT /tasks/:id`. dnd-kit drives drag/drop. Status/priority → color maps use full literal Tailwind strings (purge-safe). API gains assignee `include` + `?projectId=` filter.

## Verified Environment Constraints

- Next 14.2.5 + React 18 — `searchParams` is a SYNCHRONOUS object, `cookies()` is synchronous (`cookies().get('auth-token')?.value`). Neither gets `await` (that's Next 15 behavior).
- Tailwind v3 (JIT purge) — all status/priority colors MUST be full literal class strings in static `Record<>` maps, never interpolated.
- `Task` type already includes optional `assignee: Pick<User,'id'|'name'|'email'>` and `deadline?: Date` in `packages/types` — no type changes needed.
- API is currently UNGUARDED (no auth guard on tasks/projects). The client `PUT` omits Authorization by design (documented known gap); the server SSR fetch sends Bearer for forward-compat.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Data fetch | Server Component cookie read + SSR fetch, props to client | Client-side fetch w/ useEffect; route handler proxy | httpOnly cookie unreadable in client JS; SSR avoids loading flash and keeps token server-side |
| State mgmt | Manual `useState` + snapshot-before-mutate + rollback | React Query / SWR | Explicit user choice; board is single-view, low complexity |
| DnD lib | `@dnd-kit/core`+`/sortable`+`/utilities` | react-beautiful-dnd (unmaintained), HTML5 DnD | Maintained, accessible, React 18 compatible, sensor model |
| Drop target | Column droppable id = `TaskStatus`; cards are sortable items | Single sortable list with status zones | `over.id` resolves to columnId for cross-column moves |
| Color maps | Static `Record<>` of full Tailwind class strings | Dynamic `bg-${color}` interpolation | Tailwind v3 JIT purges non-literal classes |
| Mobile | `overflow-x-auto` outer + `min-w-max` inner | Responsive column collapse | Preserves 5-column model; horizontal scroll on narrow screens |
| Sensor | `PointerSensor` activationConstraint distance 8 | No constraint | Prevents accidental drags on click |

## Data Flow

```
Browser → /board?projectId=X (GET, cookie sent)
   │
   ▼
board/page.tsx (Server Component)
   │  cookies().get('auth-token')
   │  Promise.all([ GET /tasks?projectId=X , GET /projects ])  (Bearer)
   ▼
Sidebar(projects, active) + KanbanBoard(initialTasks)  [client island]
   │  useState(initialTasks)
   │  DndContext onDragEnd
   ▼
optimistic setTasks → PUT /tasks/:id { status }
   │                         │ ok → keep
   └── catch → setTasks(prev rollback)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/tasks/tasks.service.ts` | Modify | `findAll(projectId?)` adds `where` + `include: { assignee: { select:{id,name,email} } }`; `findOne` adds same include |
| `apps/api/src/tasks/tasks.controller.ts` | Modify | `findAll` adds `@Query('projectId') projectId?: string` → service |
| `apps/web/package.json` | Modify | Add `@dnd-kit/core ^6.1.0`, `@dnd-kit/sortable ^8.0.0`, `@dnd-kit/utilities ^3.2.2` |
| `apps/web/src/app/board/page.tsx` | Modify | Server shell: cookie read + parallel SSR fetch, render Sidebar+KanbanBoard |
| `apps/web/src/components/board/Sidebar.tsx` | Create | Project nav; `Link` to `/board?projectId=`; active highlight |
| `apps/web/src/components/board/KanbanBoard.tsx` | Create | dnd-kit root; `useState` board; optimistic PUT + rollback; header w/ logout |
| `apps/web/src/components/board/KanbanColumn.tsx` | Create | `useDroppable` + `SortableContext`; tinted header per status |
| `apps/web/src/components/board/TaskCard.tsx` | Create | `useSortable` card; priority strip + chip, deadline, assignee initials |

## Exact Implementation (key snippet)

```ts
// apps/api/src/tasks/tasks.service.ts
const assigneeInclude = { assignee: { select: { id: true, name: true, email: true } } };

findAll(projectId?: string) {
  return this.prisma.task.findMany({
    where: projectId ? { projectId } : {},
    include: assigneeInclude,
  });
}

findOne(id: string) {
  return this.prisma.task.findUnique({ where: { id }, include: assigneeInclude });
}
```

```tsx
// apps/web/src/app/board/page.tsx — Next 14, searchParams/cookies synchronous
async function fetchWithAuth<T>(path: string, token: string): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export default async function BoardPage({ searchParams }: { searchParams: { projectId?: string } }) {
  const token = cookies().get('auth-token')?.value ?? ''
  const { projectId } = searchParams
  const [tasks, projects] = await Promise.all([
    fetchWithAuth<Task[]>(projectId ? `/tasks?projectId=${projectId}` : '/tasks', token),
    fetchWithAuth<Project[]>('/projects', token),
  ])
  return (
    <div className="flex h-screen bg-[#0d0d0f]">
      <Sidebar projects={projects} activeProjectId={projectId} />
      <KanbanBoard initialTasks={tasks} />
    </div>
  )
}
```

Color maps for `KanbanColumn.tsx` and `TaskCard.tsx` (`COLUMN_STYLES`, `PRIORITY_STRIP`, `PRIORITY_CHIP`) are static `Record<TaskStatus | Priority, string>` objects keyed by full literal Tailwind/hex class strings (never interpolated), one entry per enum member.

## Gotcha — column vs. task id resolution

dnd-kit's `over.id` in `handleDragEnd` can be EITHER a column droppable id (a `TaskStatus` string) OR a sortable task id, depending on where the drop lands. The implementation adds a `VALID_STATUSES` `Set` to distinguish the two cases — implied by the design but not spelled out explicitly in the original design doc; documented here as the actual shipped behavior.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (API) | `findAll(projectId)` builds correct `where`; include shape | Jest + mocked PrismaService; assert `findMany` args |
| Unit (API) | `findOne` include | mocked prisma assertion |
| Integration | controller `@Query('projectId')` wiring | existing supertest e2e pattern |
| E2E (manual) | drag card across column persists after reload; failed PUT rolls back | manual QA — `apps/web` has no test runner |

STRICT TDD applied to the API changes (Jest exists in `apps/api`). The web layer has no test runner (`"test": "echo ..."`) — verified by `tsc --noEmit` + manual QA. Pure helpers (`getInitials`, `formatDeadline`) were extracted to be unit-testable once a web test runner exists.

## Migration / Rollout

No DB migration. API changes are purely additive (optional query param + read-time include). Rollback = revert the single PR.
