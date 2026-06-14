import { cookies } from 'next/headers'
import type { Task, Project } from '@mantys/types'
import KanbanBoard from '@/components/board/KanbanBoard'
import Sidebar from '@/components/board/Sidebar'

async function fetchWithAuth<T>(path: string, token: string): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
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
