import { getCurrentUser } from '@/app/actions/auth'
import { redirect } from 'next/navigation'

/**
 * Server Component wrapper for protected routes
 * Checks authentication on the server and redirects if not authenticated
 */
export async function ProtectedRoute({
  children,
  fallback = '/auth/login',
}: {
  children: React.ReactNode
  fallback?: string
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect(fallback)
  }

  return <>{children}</>
}

/**
 * HOC for protecting entire pages
 * Usage: export default withAuth(YourPageComponent)
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  fallback = '/auth/login'
) {
  return async function ProtectedComponent(props: P) {
    const user = await getCurrentUser()

    if (!user) {
      redirect(fallback)
    }

    // Pass user as prop to the component
    return <Component {...props} user={user} />
  }
}