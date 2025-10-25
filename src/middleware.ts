import { updateSession } from '@/lib/supabase/simplified-middleware'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Use simplified middleware that only refreshes sessions
  // Routing decisions are made by server components
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)
     * - api routes (they handle auth separately)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}