'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  type CollisionDetection,
} from '@dnd-kit/core'
import type { Task, Project, User } from '@mantys/types'
import { TaskStatus, Priority } from '@mantys/types'
import KanbanColumn from './KanbanColumn'
import TaskCard from './TaskCard'
import TaskModal from './TaskModal'
import { logoutAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getInitials } from './TaskCard'

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: TaskStatus.BACKLOG, label: 'Backlog' },
  { id: TaskStatus.TODO, label: 'Todo' },
  { id: TaskStatus.IN_PROGRESS, label: 'In Progress' },
  { id: TaskStatus.REVIEW, label: 'Review' },
  { id: TaskStatus.DONE, label: 'Done' },
]

const VALID_STATUSES = new Set<string>(Object.values(TaskStatus))

// Prefer pointer-within for empty columns; fall back to rect intersection
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) return pointerCollisions
  return rectIntersection(args)
}

const PRIORITY_PILL: Record<Priority, string> = {
  [Priority.A]: 'bg-[#1f0606] text-[#f87171] border border-[#450a0a]',
  [Priority.B]: 'bg-[#1f0a04] text-[#fb923c] border border-[#431407]',
  [Priority.C]: 'bg-[#1a1500] text-[#fbbf24] border border-[#422006]',
  [Priority.D]: 'bg-[#011a0b] text-[#4ade80] border border-[#052e16]',
}

interface ModalState {
  open: boolean
  mode: 'create' | 'edit'
  task?: Task
  columnStatus?: TaskStatus
}

interface Props {
  initialTasks: Task[]
  projects: Project[]
  users: User[]
  currentUser: { name?: string; email?: string } | null
}

export default function KanbanBoard({ initialTasks, projects, users, currentUser }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [dragError, setDragError] = useState(false)
  const [modalState, setModalState] = useState<ModalState>({ open: false, mode: 'create' })
  const [activeAssignee, setActiveAssignee] = useState<string | null>(null)
  const [activePriority, setActivePriority] = useState<Priority | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  // Derived: unique assignees in current task list
  const uniqueAssignees = Array.from(
    new Map(
      tasks
        .filter((t) => t.assignee)
        .map((t) => [t.assignee!.id, t.assignee!]),
    ).values(),
  )

  // Filtered tasks for column rendering
  const filteredTasks = tasks.filter(
    (t) =>
      (!activeAssignee || t.assignee?.id === activeAssignee) &&
      (!activePriority || t.priority === activePriority),
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveTask(tasks.find((t) => t.id === event.active.id) ?? null)
    },
    [tasks],
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveTask(null)
      const { active, over } = event
      if (!over || active.id === over.id) return

      const taskId = active.id as string

      let newStatus: TaskStatus
      if (VALID_STATUSES.has(over.id as string)) {
        newStatus = over.id as TaskStatus
      } else {
        const overTask = tasks.find((t) => t.id === over.id)
        if (!overTask) return
        newStatus = overTask.status
      }

      const task = tasks.find((t) => t.id === taskId)
      if (!task || task.status === newStatus) return

      const prev = tasks
      setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))

      try {
        const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002'
        const res = await fetch(`${base}/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
        if (!res.ok) throw new Error('PUT failed')
      } catch {
        setTasks(prev)
        setDragError(true)
        setTimeout(() => setDragError(false), 3000)
      }
    },
    [tasks],
  )

  function openCreateModal(columnStatus: TaskStatus) {
    setModalState({ open: true, mode: 'create', columnStatus })
  }

  function openEditModal(task: Task) {
    setModalState({ open: true, mode: 'edit', task })
  }

  function closeModal() {
    setModalState({ open: false, mode: 'create' })
  }

  function handleSave(saved: Task) {
    setTasks((ts) => {
      const exists = ts.find((t) => t.id === saved.id)
      if (exists) return ts.map((t) => (t.id === saved.id ? saved : t))
      return [...ts, saved]
    })
  }

  function handleDelete(taskId: string) {
    setTasks((ts) => ts.filter((t) => t.id !== taskId))
  }

  const userInitials = currentUser ? getInitials(currentUser.name, currentUser.email) : '?'

  return (
    <div className="relative flex flex-col flex-1 overflow-hidden">
      <header className="flex items-center justify-between px-6 h-[52px] bg-[#101013] border-b border-[#1d1d21] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
            M
          </div>
          <span className="text-sm font-bold text-white tracking-tight">MANTYS Kanban</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white ring-2 ring-[#1d1d21] ring-offset-1 ring-offset-[#101013]">
            {userInitials}
          </div>
          <form action={logoutAction}>
            <Button
              variant="outline"
              size="sm"
              type="submit"
              className="text-xs border-[#2a2a2e] text-[#71717a] hover:text-[#a1a1aa] bg-transparent"
            >
              Log out
            </Button>
          </form>
        </div>
      </header>

      {/* Filter toolbar */}
      <div className="flex items-center gap-4 px-5 py-2.5 border-b border-[#1d1d21] bg-[#0d0d0f] flex-shrink-0 overflow-x-auto">
        {/* Assignee filter */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs text-[#52525b] font-medium">Assignee:</span>
          <button
            onClick={() => setActiveAssignee(null)}
            className={cn(
              'text-xs px-2.5 py-1 rounded-full transition-colors',
              activeAssignee === null
                ? 'bg-indigo-600 text-white'
                : 'bg-[#1d1d21] text-[#71717a] hover:text-[#a1a1aa]',
            )}
          >
            All
          </button>
          {uniqueAssignees.map((u) => (
            <button
              key={u.id}
              onClick={() => setActiveAssignee(activeAssignee === u.id ? null : u.id)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full transition-colors',
                activeAssignee === u.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#1d1d21] text-[#71717a] hover:text-[#a1a1aa]',
              )}
            >
              {getInitials(u.name, u.email)}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-[#27272b] flex-shrink-0" />

        {/* Priority filter */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs text-[#52525b] font-medium">Priority:</span>
          <button
            onClick={() => setActivePriority(null)}
            className={cn(
              'text-xs px-2.5 py-1 rounded-full transition-colors',
              activePriority === null
                ? 'bg-indigo-600 text-white'
                : 'bg-[#1d1d21] text-[#71717a] hover:text-[#a1a1aa]',
            )}
          >
            All
          </button>
          {Object.values(Priority).map((p) => (
            <button
              key={p}
              onClick={() => setActivePriority(activePriority === p ? null : p)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full transition-colors',
                activePriority === p
                  ? PRIORITY_PILL[p]
                  : 'bg-[#1d1d21] text-[#71717a] hover:text-[#a1a1aa]',
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {dragError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-[#1f0606] border border-[#450a0a] text-[#f87171] text-xs font-medium shadow-lg">
          Failed to move task — reverted
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3.5 p-5 h-full min-w-max">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                id={col.id}
                label={col.label}
                tasks={filteredTasks.filter((t) => t.status === col.id)}
                onAddTask={openCreateModal}
                onEditTask={openEditModal}
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {modalState.open && (
        <TaskModal
          mode={modalState.mode}
          task={modalState.task}
          columnStatus={modalState.columnStatus}
          projects={projects}
          users={users}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
