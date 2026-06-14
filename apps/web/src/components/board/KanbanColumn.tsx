'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Task } from '@mantys/types'
import { TaskStatus } from '@mantys/types'
import TaskCard from './TaskCard'
import { cn } from '@/lib/utils'

const COLUMN_STYLES: Record<TaskStatus, { header: string; body: string; label: string; badge: string }> = {
  [TaskStatus.BACKLOG]: {
    header: 'bg-[#18181c] border-[#27272b]',
    body: 'bg-[#111115] border-[#27272b]',
    label: 'text-[#71717a]',
    badge: 'bg-[#27272b] text-[#71717a]',
  },
  [TaskStatus.TODO]: {
    header: 'bg-[#1a1a1f] border-[#2d2d35]',
    body: 'bg-[#13131a] border-[#2d2d35]',
    label: 'text-[#a1a1aa]',
    badge: 'bg-[#2d2d35] text-[#a1a1aa]',
  },
  [TaskStatus.IN_PROGRESS]: {
    header: 'bg-[#1a1933] border-[#2e2b5a]',
    body: 'bg-[#11112a] border-[#2e2b5a]',
    label: 'text-[#818cf8]',
    badge: 'bg-[#2e2b5a] text-[#818cf8]',
  },
  [TaskStatus.REVIEW]: {
    header: 'bg-[#1f1800] border-[#3d3000]',
    body: 'bg-[#111008] border-[#3d3000]',
    label: 'text-[#fbbf24]',
    badge: 'bg-[#3d3000] text-[#fbbf24]',
  },
  [TaskStatus.DONE]: {
    header: 'bg-[#0a1f12] border-[#143320]',
    body: 'bg-[#0a120e] border-[#143320]',
    label: 'text-[#4ade80]',
    badge: 'bg-[#143320] text-[#4ade80]',
  },
}

interface Props {
  id: TaskStatus
  label: string
  tasks: Task[]
  onAddTask: (columnStatus: TaskStatus) => void
  onEditTask: (task: Task) => void
}

export default function KanbanColumn({ id, label, tasks, onAddTask, onEditTask }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const styles = COLUMN_STYLES[id]
  const taskIds = tasks.map((t) => t.id)

  return (
    <div className="flex flex-col w-[250px] flex-shrink-0">
      <div
        className={cn(
          'flex items-center justify-between px-3.5 py-2.5 rounded-t-[10px] border border-b-0',
          styles.header,
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-semibold uppercase tracking-[0.04em]', styles.label)}>
            {label}
          </span>
          <span
            className={cn(
              'text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center',
              styles.badge,
            )}
          >
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(id)}
          className={cn(
            'w-5 h-5 rounded flex items-center justify-center text-lg leading-none transition-opacity opacity-50 hover:opacity-100',
            styles.label,
          )}
          title="New task"
          aria-label="New task"
        >
          +
        </button>
      </div>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex-1 flex flex-col gap-1.5 p-2 rounded-b-[10px] border border-t-0 min-h-[120px] transition-colors',
            styles.body,
            isOver && 'ring-1 ring-indigo-500/30',
          )}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onEditTask(task)} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
