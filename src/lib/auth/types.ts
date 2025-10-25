/**
 * Auth type definitions and helper functions
 * Separate from server actions file to avoid compilation issues
 */

// Types for better error handling
export type AuthError = {
  error: string
  code?: string
  status?: number
}

export type AuthSuccess<T = unknown> = {
  data: T
  error?: never
}

export type AuthResult<T = unknown> = AuthSuccess<T> | AuthError

// Helper to check if result is error
export function isAuthError<T>(result: AuthResult<T>): result is AuthError {
  return 'error' in result && result.error !== undefined
}