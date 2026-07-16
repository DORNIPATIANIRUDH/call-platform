import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Redirect to onboarding if no org
    if (path.startsWith('/dashboard') && token && !token.orgId) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        // Public paths
        if (path === '/' || path.startsWith('/login') || path.startsWith('/api/auth')) {
          return true
        }
        // Webhook paths — no auth needed (verified by signature)
        if (path.startsWith('/api/webhooks')) return true
        // Everything else requires a token
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
