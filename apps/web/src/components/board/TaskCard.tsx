'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '@mantys/types'
import { Priority } from '@mantys/types'
import { cn } from '@/lib/utils'

const PRIORITY_STRIP: Record<Priority, string> = {
  [Priority.A]: 'bg-[#ef4444]',
  [Priority.B]: 'bg-[#f97316]',
  [Priority.C]: 'bg-[#eab308]',
  [Priority.D]: 'bg-[#22c55e]',
}

const PRIORITY_CHIP: Record<Priority, string> = {
  [Priority.A]: 'bg-[#1f0606] text-[#f87171] border-[#450a0a]',
  [Priority.B]: 'bg-[#1f0a04] text-[#fb923c] border-[#431407]',
  [Priority.C]: 'bg-[#1a1500] text-[#fbbf24] border-[#422006]',
  [Priority.D]: 'bg-[#011a0b] text-[#4ade80] border-[#052e16]',
}

const PRIORITY_LABEL: Record<Priority, string> = {
  [Priority.A]: 'Urgente',
  [Priority.B]: 'Alta',
  [Priority.C]: 'Media',
  [Priority.D]: 'Baja',
}

interface Props {
  task: Task
  isDragging?: boolean
  onClick?: () => void
}

export function getInitials(name?: string | null, email?: string | null): string {
  if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  if (email) return email.slice(0, 2).toUpperCase()
  return '?'
}

export function formatDeadline(date?: Date | string | null): string | null {
  if (!date) return null
  return new Date(date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

export default function TaskCard({ task, isDragging = false, onClick }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'flex gap-2 bg-[#18181c] border border-[#27272b] rounded-lg p-2.5 cursor-grab active:cursor-grabbing transition-all select-none',
        (isDragging || isSortableDragging) && 'opacity-40 ring-1 ring-indigo-500/50',
        'hover:bg-[#1e1e23] hover:border-[#3f3f46]',
        onClick && 'cursor-pointer',
      )}
    >
      <div className={cn('w-[3px] rounded-sm flex-shrink-0', PRIORITY_STRIP[task.priority])} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[#d4d4d8] font-medium leading-snug mb-2 line-clamp-2">
          {task.title}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'text-[10.5px] font-bold px-1.5 py-0.5 rounded border',
              PRIORITY_CHIP[task.priority],
            )}
          >
            {task.priority} · {PRIORITY_LABEL[task.priority]}
          </span>
          <div className="flex items-center gap-1.5">
            {task.deadline && (
              <span className="text-[10.5px] text-[#52525b]">
                {formatDeadline(task.deadline)}
              </span>
            )}
            {task.assignee && (
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-[8.5px] font-bold text-white flex-shrink-0">
                {getInitials(task.assignee.name, task.assignee.email)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
