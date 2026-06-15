import { cookies } from 'next/headers'
import { redirect, permanentRedirect, notFound } from 'next/navigation'
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

  // Legacy redirect: /board?projectId=<cuid> → /board/<slug>
  if (projectId) {
    let project: Project
    try {
      project = await fetchWithAuth<Project>(`/projects/${projectId}`, token)
    } catch {
      notFound()
    }
    permanentRedirect(`/board/${project!.slug}`)
  }

  // All-projects view
  const [tasks, projects, users, profile] = await Promise.all([
    fetchWithAuth<Task[]>('/tasks', token),
    fetchWithAuth<Project[]>('/projects', token),
    fetchWithAuth<User[]>('/users', token),
    fetchWithAuth<JwtProfile>('/auth/profile', token).catch(() => null),
  ])

  if (projects.length === 0) redirect('/projects/new')

  const foundUser = profile ? users.find((u) => u.id === profile.id) : undefined
  const currentUser = profile
    ? (foundUser
        ? { name: foundUser.name, email: foundUser.email, role: profile.role }
        : { name: undefined, email: profile.email, role: profile.role })
    : null

  return (
    <div className="flex h-screen bg-[#0d0d0f]">
      <Sidebar projects={projects} currentUserRole={profile?.role} />
      <KanbanBoard
        key="all"
        initialTasks={tasks}
        projects={projects}
        users={users}
        currentUser={currentUser}
      />
    </div>
  )
}
