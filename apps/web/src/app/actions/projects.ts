'use server'

import { cookies } from 'next/headers'
import type { Project } from '@mantys/types'

const COOKIE_NAME = 'auth-token'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002'

export interface ProjectPayload {
  name: string
  description?: string
}

export type SaveProjectResult = { ok: true; project: Project } | { ok: false; error: string }
export type DeleteProjectResult = { ok: true } | { ok: false; error: string }

async function saveProject(path: string, method: 'POST' | 'PUT', payload: ProjectPayload): Promise<SaveProjectResult> {
  const token = cookies().get(COOKIE_NAME)?.value
  if (!token) return { ok: false, error: 'Not authenticated' }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
    if (res.status === 401) return { ok: false, error: 'Session expired. Please log in again.' }
    if (!res.ok) return { ok: false, error: 'Could not save project. Try again.' }
    return { ok: true, project: (await res.json()) as Project }
  } catch {
    return { ok: false, error: 'Could not save project. Try again.' }
  }
}

export async function createProjectAction(payload: ProjectPayload): Promise<SaveProjectResult> {
  return saveProject('/projects', 'POST', payload)
}

export async function updateProjectAction(projectId: string, payload: ProjectPayload): Promise<SaveProjectResult> {
  return saveProject(`/projects/${projectId}`, 'PUT', payload)
}

export async function deleteProjectAction(projectId: string): Promise<DeleteProjectResult> {
  const token = cookies().get(COOKIE_NAME)?.value
  if (!token) return { ok: false, error: 'Not authenticated' }

  try {
    const res = await fetch(`${API_URL}/projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })

    if (res.status === 403) return { ok: false, error: 'Only owners can delete projects' }
    if (res.status === 401) return { ok: false, error: 'Session expired. Please log in again.' }
    if (!res.ok) return { ok: false, error: 'Could not delete project. Try again.' }

    // DELETE returns 204 — no body to parse
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not delete project. Try again.' }
  }
}
