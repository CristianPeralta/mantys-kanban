'use server'

import { cookies } from 'next/headers'
import type { Task } from '@mantys/types'

const COOKIE_NAME = 'auth-token'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002'

export interface TaskPayload {
  title?: string
  description?: string
  status?: string
  priority?: string
  assigneeId?: string
  deadline?: string
  projectId?: string
}

export type SaveTaskResult = { ok: true; task: Task } | { ok: false; error: string }
export type DeleteTaskResult = { ok: true } | { ok: false; error: string }

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

function errorFor(status: number): string {
  if (status === 401) return 'Session expired. Please log in again.'
  return 'Could not save task. Try again.'
}

export async function createTaskAction(payload: TaskPayload): Promise<SaveTaskResult> {
  const token = cookies().get(COOKIE_NAME)?.value
  if (!token) return { ok: false, error: 'Not authenticated' }

  try {
    const res = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
    if (!res.ok) return { ok: false, error: errorFor(res.status) }
    return { ok: true, task: (await res.json()) as Task }
  } catch {
    return { ok: false, error: 'Could not save task. Try again.' }
  }
}

export async function updateTaskAction(taskId: string, payload: TaskPayload): Promise<SaveTaskResult> {
  const token = cookies().get(COOKIE_NAME)?.value
  if (!token) return { ok: false, error: 'Not authenticated' }

  try {
    const res = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
    if (!res.ok) return { ok: false, error: errorFor(res.status) }
    return { ok: true, task: (await res.json()) as Task }
  } catch {
    return { ok: false, error: 'Could not save task. Try again.' }
  }
}

export async function deleteTaskAction(taskId: string): Promise<DeleteTaskResult> {
  const token = cookies().get(COOKIE_NAME)?.value
  if (!token) return { ok: false, error: 'Not authenticated' }

  try {
    const res = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return { ok: false, error: res.status === 401 ? 'Session expired. Please log in again.' : 'Could not delete task. Try again.' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not delete task. Try again.' }
  }
}
