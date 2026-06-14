import Link from 'next/link'
import type { Project } from '@mantys/types'
import { cn } from '@/lib/utils'

interface Props {
  projects: Project[]
  activeProjectId?: string
}

export default function Sidebar({ projects, activeProjectId }: Props) {
  return (
    <aside className="w-56 flex-shrink-0 bg-[#101013] border-r border-[#1d1d21] flex flex-col">
      <div className="px-4 py-4 border-b border-[#1d1d21]">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#52525b]">Projects</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <Link
          href="/board"
          className={cn(
            'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
            !activeProjectId
              ? 'bg-[#18181c] text-[#e4e4e7]'
              : 'text-[#71717a] hover:bg-[#18181c] hover:text-[#a1a1aa]',
          )}
        >
          All projects
        </Link>
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/board?projectId=${p.id}`}
            className={cn(
              'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors mt-0.5',
              activeProjectId === p.id
                ? 'bg-[#18181c] text-[#e4e4e7]'
                : 'text-[#71717a] hover:bg-[#18181c] hover:text-[#a1a1aa]',
            )}
          >
            {p.name}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
