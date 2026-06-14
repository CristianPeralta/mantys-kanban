'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Project } from '@mantys/types'
import { cn } from '@/lib/utils'
import ProjectModal from './ProjectModal'

interface Props {
  projects: Project[]
  activeProjectId?: string
  currentUserRole?: string
}

export default function Sidebar({ projects: initialProjects, activeProjectId, currentUserRole }: Props) {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit'; project?: Project }>({
    open: false,
    mode: 'create',
  })

  function openCreate() {
    setModal({ open: true, mode: 'create' })
  }

  function openEdit(project: Project) {
    setModal({ open: true, mode: 'edit', project })
  }

  function handleSave(saved: Project) {
    setProjects((prev) => {
      const exists = prev.find((p) => p.id === saved.id)
      return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved]
    })
    setModal({ open: false, mode: 'create' })
    if (modal.mode === 'create') {
      router.push(`/board?projectId=${saved.id}`)
    }
  }

  function handleDelete(projectId: string) {
    const remaining = projects.filter((p) => p.id !== projectId)
    setProjects(remaining)
    setModal({ open: false, mode: 'create' })
    if (remaining.length === 0) {
      router.push('/projects/new')
    } else if (activeProjectId === projectId) {
      router.push('/board')
    }
  }

  return (
    <>
      <aside className="w-56 flex-shrink-0 bg-[#101013] border-r border-[#1d1d21] flex flex-col">
        <div className="px-4 py-4 border-b border-[#1d1d21] flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#71717a]">Projects</span>
          <button
            onClick={openCreate}
            title="New project"
            className="w-5 h-5 flex items-center justify-center text-[#71717a] hover:text-[#e4e4e7] transition-colors text-base leading-none"
          >
            +
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <Link
            href="/board"
            className={cn(
              'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
              !activeProjectId
                ? 'bg-[#18181c] text-[#e4e4e7]'
                : 'text-[#a1a1aa] hover:bg-[#18181c] hover:text-[#e4e4e7]',
            )}
          >
            All projects
          </Link>
          {projects.map((p) => (
            <div key={p.id} className="group relative mt-0.5">
              <Link
                href={`/board?projectId=${p.id}`}
                className={cn(
                  'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors pr-8',
                  activeProjectId === p.id
                    ? 'bg-[#18181c] text-[#e4e4e7]'
                    : 'text-[#a1a1aa] hover:bg-[#18181c] hover:text-[#e4e4e7]',
                )}
              >
                {p.name}
              </Link>
              <button
                onClick={() => openEdit(p)}
                title="Edit project"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[#71717a] hover:text-[#e4e4e7] opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              >
                ✎
              </button>
            </div>
          ))}
        </nav>
      </aside>

      {modal.open && (
        <ProjectModal
          mode={modal.mode}
          project={modal.project}
          onClose={() => setModal({ open: false, mode: 'create' })}
          onSave={handleSave}
          onDelete={handleDelete}
          currentUserRole={currentUserRole}
        />
      )}
    </>
  )
}
