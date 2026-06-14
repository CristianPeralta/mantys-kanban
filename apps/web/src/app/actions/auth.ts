'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { LoginResponse } from '@mantys/types'

const COOKIE_NAME = 'auth-token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export type LoginState = { error: string } | undefined

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  let success = false

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    })

    if (!res.ok) {
      return { error: 'Invalid email or password' }
    }

    const data: LoginResponse = await res.json()

    cookies().set(COOKIE_NAME, data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    success = true
  } catch {
    return { error: 'Something went wrong. Please try again.' }
  }

  // redirect() throws a Next.js control-flow signal — it MUST run outside
  // try/catch or the catch would swallow it and break navigation.
  if (success) redirect('/board')
  return undefined
}

export async function logoutAction() {
  cookies().delete(COOKIE_NAME)
  redirect('/login')
}
