import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Task, Project, User } from '@mantys/types'
import KanbanBoard from '@/components/board/KanbanBoard'
import Sidebar from '@/components/board/Sidebar'

interface JwtProfile {
  id: string
  email: string
  role: string
}

async function fetchWithAuth<T>(path: string, token: string): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002'
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: { projectId?: string }
}) {
  const token = cookies().get('auth-token')?.value ?? ''
  const { projectId } = searchParams

  const [tasks, projects, users, profile] = await Promise.all([
    fetchWithAuth<Task[]>(projectId ? `/tasks?projectId=${projectId}` : '/tasks', token),
    fetchWithAuth<Project[]>('/projects', token),
    fetchWithAuth<User[]>('/users', token),
    fetchWithAuth<JwtProfile>('/auth/profile', token).catch(() => null),
  ])

  if (projects.length === 0) redirect('/projects/new')

  const currentUser = profile
    ? (users.find((u) => u.id === profile.id) ?? { name: undefined, email: profile.email })
    : null

  return (
    <div className="flex h-screen bg-[#0d0d0f]">
      <Sidebar projects={projects} activeProjectId={projectId} />
      <KanbanBoard
        key={projectId ?? 'all'}
        initialTasks={tasks}
        projects={projects}
        users={users}
        currentUser={currentUser}
      />
    </div>
  )
}
