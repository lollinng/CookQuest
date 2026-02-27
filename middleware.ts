import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedPaths = ['/profile', '/settings']
const authPaths = ['/login', '/register']

export function middleware(request: NextRequest) {
  const token = request.cookies.get('cookquest_token')?.value
  const { pathname } = request.nextUrl

  // Redirect authenticated users away from auth pages
  if (authPaths.some(p => pathname.startsWith(p)) && token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Redirect unauthenticated users to home with auth prompt
  if (protectedPaths.some(p => pathname.startsWith(p)) && !token) {
    const loginUrl = new URL('/', request.url)
    loginUrl.searchParams.set('auth', 'required')
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  return response
}

export const config = {
  matcher: [
    // Match all paths except static files and api routes
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
