'use client'

import { useState } from 'react'
import type { Project } from '@mantys/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  mode: 'create' | 'edit'
  project?: Project
  onClose: () => void
  onSave: (project: Project) => void
  onDelete?: (projectId: string) => void
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002'

export default function ProjectModal({ mode, project, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        mode === 'create' ? `${BASE}/projects` : `${BASE}/projects/${project!.id}`,
        {
          method: mode === 'create' ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
        },
      )
      if (!res.ok) throw new Error('Failed to save project')
      const saved: Project = await res.json()
      onSave(saved)
    } catch {
      setError('Could not save project. Try again.')
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!project) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BASE}/projects/${project.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete project')
      onDelete?.(project.id)
    } catch {
      setError('Could not delete project. Try again.')
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#18181c] border-[#27272b] text-[#d4d4d8] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#e4e4e7] text-base">
            {mode === 'create' ? 'New Project' : 'Edit Project'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {mode === 'create' ? 'Fill in the fields to create a new project.' : 'Edit the project fields and save.'}
          </DialogDescription>
        </DialogHeader>

        {confirmDelete ? (
          <div className="space-y-4">
            <p className="text-sm text-[#a1a1aa]">
              Delete <span className="text-[#e4e4e7] font-medium">{project?.name}</span>? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 border-[#27272b] text-[#a1a1aa] bg-transparent hover:bg-[#27272b]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 bg-[#450a0a] hover:bg-[#7f1d1d] text-[#f87171] border-0"
              >
                {loading ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5" htmlFor="proj-name">
                Name <span className="text-[#ef4444]">*</span>
              </label>
              <input
                id="proj-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Impresiones 3D"
                required
                className="w-full px-3 py-2 rounded-lg bg-[#111115] border border-[#27272b] text-sm text-white placeholder-[#52525b] focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5" htmlFor="proj-desc">
                Description <span className="text-[#52525b]">(optional)</span>
              </label>
              <textarea
                id="proj-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this project about?"
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-[#111115] border border-[#27272b] text-sm text-white placeholder-[#52525b] focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="text-xs text-[#f87171] bg-[#1f0606] border border-[#450a0a] rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              {mode === 'edit' && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="bg-transparent hover:bg-[#1f0606] text-[#f87171] border border-[#450a0a] text-xs"
                >
                  Delete
                </Button>
              )}
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="border-[#27272b] text-[#a1a1aa] bg-transparent hover:bg-[#27272b] text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || !name.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs disabled:opacity-50"
              >
                {loading ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
