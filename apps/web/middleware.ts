import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'auth-token'
const PUBLIC_PATHS = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(COOKIE_NAME)?.value
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p)

  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (token && isPublicPath) {
    return NextResponse.redirect(new URL('/board', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
}
