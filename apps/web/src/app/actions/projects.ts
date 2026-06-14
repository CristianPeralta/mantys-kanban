'use server'

import { cookies } from 'next/headers'

const COOKIE_NAME = 'auth-token'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002'

export type DeleteProjectResult = { ok: true } | { ok: false; error: string }

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
