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
  closestCorners,
} from '@dnd-kit/core'
import type { Task } from '@mantys/types'
import { TaskStatus } from '@mantys/types'
import KanbanColumn from './KanbanColumn'
import TaskCard from './TaskCard'
import { logoutAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: TaskStatus.BACKLOG, label: 'Backlog' },
  { id: TaskStatus.TODO, label: 'Todo' },
  { id: TaskStatus.IN_PROGRESS, label: 'In Progress' },
  { id: TaskStatus.REVIEW, label: 'Review' },
  { id: TaskStatus.DONE, label: 'Done' },
]

const VALID_STATUSES = new Set<string>(Object.values(TaskStatus))

interface Props {
  initialTasks: Task[]
}

export default function KanbanBoard({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [dragError, setDragError] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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

      // over.id can be a column status (droppable) or a task id (sortable)
      let newStatus: TaskStatus
      if (VALID_STATUSES.has(over.id as string)) {
        newStatus = over.id as TaskStatus
      } else {
        // over is a task — use that task's current status as the target column
        const overTask = tasks.find((t) => t.id === over.id)
        if (!overTask) return
        newStatus = overTask.status
      }

      const task = tasks.find((t) => t.id === taskId)
      if (!task || task.status === newStatus) return

      const prev = tasks
      setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))

      try {
        const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
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
            CP
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

      {dragError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-[#1f0606] border border-[#450a0a] text-[#f87171] text-xs font-medium shadow-lg">
          Failed to move task — reverted
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
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
                tasks={tasks.filter((t) => t.status === col.id)}
              />
            ))}
          </div>
        </div>
        <DragOverlay>{activeTask ? <TaskCard task={activeTask} isDragging /> : null}</DragOverlay>
      </DndContext>
    </div>
  )
}
