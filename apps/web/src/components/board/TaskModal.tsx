'use client'

import { useState } from 'react'
import type { Task, Project, User } from '@mantys/types'
import { Priority, TaskStatus } from '@mantys/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002'

const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.A]: 'A — Urgent',
  [Priority.B]: 'B — High',
  [Priority.C]: 'C — Medium',
  [Priority.D]: 'D — Low',
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.BACKLOG]: 'Backlog',
  [TaskStatus.TODO]: 'Todo',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.REVIEW]: 'Review',
  [TaskStatus.DONE]: 'Done',
}

interface Props {
  mode: 'create' | 'edit'
  task?: Task
  columnStatus?: TaskStatus
  projects: Project[]
  users: User[]
  onClose: () => void
  onSave: (task: Task) => void
  onDelete?: (taskId: string) => void
}

const inputClass =
  'w-full rounded-md border border-[#2a2a2e] bg-[#111115] text-[#d4d4d8] text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-[#52525b]'

const labelClass = 'block text-xs font-medium text-[#71717a] mb-1'

export default function TaskModal({
  mode,
  task,
  columnStatus,
  projects,
  users,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const defaultStatus = task?.status ?? columnStatus ?? TaskStatus.BACKLOG
  const defaultProjectId = task?.projectId ?? projects[0]?.id ?? ''

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(defaultStatus)
  const [priority, setPriority] = useState<Priority>(task?.priority ?? Priority.C)
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? '')
  const [deadline, setDeadline] = useState(
    task?.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : '',
  )
  const [projectId, setProjectId] = useState(defaultProjectId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave() {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!projectId) {
      setError('Project is required')
      return
    }
    setError(null)
    setSaving(true)

    try {
      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        assigneeId: assigneeId || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        projectId,
      }

      let res: Response
      if (mode === 'create') {
        res = await fetch(`${BASE}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch(`${BASE}/tasks/${task!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      if (!res.ok) throw new Error(`API error ${res.status}`)
      const saved: Task = await res.json()
      onSave(saved)
      onClose()
    } catch {
      setError('Failed to save task. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!task) return
    setDeleting(true)
    try {
      const res = await fetch(`${BASE}/tasks/${task.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      onDelete?.(task.id)
      onClose()
    } catch {
      setError('Failed to delete task. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#18181c] border-[#27272b] text-[#d4d4d8] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#e4e4e7] text-base">
            {mode === 'create' ? 'New Task' : 'Edit Task'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Title */}
          <div>
            <label className={labelClass}>Title *</label>
            <input
              className={inputClass}
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={`${inputClass} resize-none`}
              placeholder="Optional description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Status + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Status</label>
              <select
                className={inputClass}
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
              >
                {Object.values(TaskStatus).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select
                className={inputClass}
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                {Object.values(Priority).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee + Deadline row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Assignee</label>
              <select
                className={inputClass}
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Deadline</label>
              <input
                type="date"
                className={`${inputClass} [color-scheme:dark]`}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          {/* Project */}
          <div>
            <label className={labelClass}>Project *</label>
            <select
              className={inputClass}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-xs text-[#f87171] bg-[#1f0606] border border-[#450a0a] rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="flex-row items-center gap-2 pt-2">
          {/* Delete button (edit mode only) */}
          {mode === 'edit' && !confirmDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[#f87171] hover:text-[#ef4444] hover:bg-[#1f0606] mr-auto"
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
            >
              Delete
            </Button>
          )}

          {mode === 'edit' && confirmDelete && (
            <div className="flex items-center gap-2 mr-auto">
              <span className="text-xs text-[#f87171]">Delete this task?</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-[#71717a] hover:text-[#a1a1aa]"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-[#450a0a] text-[#f87171] hover:bg-[#7f1d1d] border-0"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Confirm'}
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="text-[#71717a] hover:text-[#a1a1aa]"
            onClick={onClose}
            disabled={saving || deleting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white border-0"
            onClick={handleSave}
            disabled={saving || deleting}
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
