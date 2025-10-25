'use server'

import { createClient } from '@/lib/supabase/server-simple'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { logger } from '@/lib/utils/logger'
import type { AuthResult } from '@/lib/auth/types'

// Helper to get redirect URL
async function getRedirectUrl(path: string = '') {
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  return `${protocol}://${host}${path}`
}

/**
 * Server-side sign in with comprehensive error handling
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult<{ requiresEmailVerification?: boolean }>> {
  try {
    // Validate inputs
    if (!email || !password) {
      logger.warn('Sign in attempted with missing credentials')
      return { error: 'Email and password are required' }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { error: 'Please enter a valid email address' }
    }

    // Create Supabase client
    const supabase = await createClient()

    logger.info('Attempting sign in for user', { email })

    // Attempt sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(), // Normalize email
      password,
    })

    if (error) {
      logger.error('Sign in failed', {
        error: error.message,
        code: error.code,
        status: error.status,
        email
      })

      // Handle specific error cases
      if (error.message?.includes('Email not confirmed')) {
        return {
          error: 'Please verify your email before signing in',
          code: 'email_not_verified',
          status: 403
        }
      }

      if (error.status === 400 || error.message?.includes('Invalid login credentials')) {
        return {
          error: 'Invalid email or password',
          code: 'invalid_credentials',
          status: 401
        }
      }

      if (error.message?.includes('rate limit')) {
        return {
          error: 'Too many attempts. Please try again later',
          code: 'rate_limit',
          status: 429
        }
      }

      return {
        error: error.message || 'Sign in failed',
        code: error.code,
        status: error.status
      }
    }

    // Check if we got a valid session
    if (!data.session) {
      logger.error('Sign in succeeded but no session returned', { email })
      return {
        error: 'Session could not be established. Please try again',
        code: 'no_session',
        status: 500
      }
    }

    // Double-check session is properly stored
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      logger.error('Session verification failed after sign in', {
        email,
        error: userError?.message
      })
      return {
        error: 'Session verification failed. Please try again',
        code: 'session_verification_failed',
        status: 500
      }
    }

    logger.info('Sign in successful', {
      userId: user.id,
      email: user.email
    })

    // Success - return data for client to handle
    return { data: { requiresEmailVerification: false } }

  } catch (error) {
    logger.error('Unexpected error during sign in', {
      error: error instanceof Error ? error.message : 'Unknown error',
      email
    })
    return {
      error: 'An unexpected error occurred. Please try again',
      code: 'unexpected_error',
      status: 500
    }
  }
}

/**
 * Server-side sign up with email verification
 */
export async function signUp(
  email: string,
  password: string
): Promise<AuthResult<{ requiresEmailVerification: boolean }>> {
  try {
    // Validate inputs
    if (!email || !password) {
      return { error: 'Email and password are required' }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { error: 'Please enter a valid email address' }
    }

    // Password strength validation
    if (password.length < 6) {
      return { error: 'Password must be at least 6 characters' }
    }

    // Create Supabase client
    const supabase = await createClient()

    logger.info('Attempting sign up for user', { email })

    // Get redirect URL for email confirmation
    const redirectUrl = await getRedirectUrl('/auth/callback')

    // Attempt sign up
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    })

    if (error) {
      logger.error('Sign up failed', {
        error: error.message,
        code: error.code,
        email
      })

      // Handle specific error cases
      if (error.message?.includes('already registered')) {
        return {
          error: 'An account with this email already exists',
          code: 'user_exists',
          status: 409
        }
      }

      if (error.message?.includes('rate limit')) {
        return {
          error: 'Too many attempts. Please try again later',
          code: 'rate_limit',
          status: 429
        }
      }

      return {
        error: error.message || 'Sign up failed',
        code: error.code,
        status: error.status
      }
    }

    logger.info('Sign up successful, email verification required', { email })

    return {
      data: {
        requiresEmailVerification: true
      }
    }

  } catch (error) {
    logger.error('Unexpected error during sign up', {
      error: error instanceof Error ? error.message : 'Unknown error',
      email
    })
    return {
      error: 'An unexpected error occurred. Please try again',
      code: 'unexpected_error',
      status: 500
    }
  }
}

/**
 * Server-side sign out
 */
export async function signOut(): Promise<AuthResult<{ success: boolean }>> {
  try {
    const supabase = await createClient()

    // Get current user for logging
    const { data: { user } } = await supabase.auth.getUser()

    logger.info('Attempting sign out', { userId: user?.id })

    const { error } = await supabase.auth.signOut()

    if (error) {
      logger.error('Sign out failed', {
        error: error.message,
        userId: user?.id
      })
      return {
        error: 'Sign out failed. Please try again',
        code: 'signout_failed',
        status: 500
      }
    }

    logger.info('Sign out successful', { userId: user?.id })

    return { data: { success: true } }

  } catch (error) {
    logger.error('Unexpected error during sign out', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
      status: 500
    }
  }
}

/**
 * Request password reset with email
 */
export async function requestPasswordReset(
  email: string
): Promise<AuthResult<{ emailSent: boolean }>> {
  try {
    if (!email) {
      return { error: 'Email is required' }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { error: 'Please enter a valid email address' }
    }

    const supabase = await createClient()
    const redirectUrl = await getRedirectUrl('/auth/update-password')

    logger.info('Password reset requested', { email })

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: redirectUrl,
      }
    )

    if (error) {
      logger.error('Password reset failed', {
        error: error.message,
        email
      })

      if (error.message?.includes('rate limit')) {
        return {
          error: 'Too many attempts. Please try again later',
          code: 'rate_limit',
          status: 429
        }
      }

      // Don't reveal if email exists or not for security
      // Always return success to prevent email enumeration
    }

    logger.info('Password reset email sent', { email })

    // Always return success (security best practice)
    return {
      data: { emailSent: true }
    }

  } catch (error) {
    logger.error('Unexpected error during password reset', {
      error: error instanceof Error ? error.message : 'Unknown error',
      email
    })
    return {
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
      status: 500
    }
  }
}

/**
 * Update password after reset
 */
export async function updatePassword(
  newPassword: string
): Promise<AuthResult<{ success: boolean }>> {
  try {
    if (!newPassword) {
      return { error: 'New password is required' }
    }

    if (newPassword.length < 6) {
      return { error: 'Password must be at least 6 characters' }
    }

    const supabase = await createClient()

    // Check if user is authenticated (came from reset link)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      logger.error('No authenticated user for password update')
      return {
        error: 'Invalid or expired password reset link',
        code: 'invalid_token',
        status: 401
      }
    }

    logger.info('Attempting password update', { userId: user.id })

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      logger.error('Password update failed', {
        error: error.message,
        userId: user.id
      })
      return {
        error: error.message || 'Password update failed',
        code: error.code,
        status: error.status
      }
    }

    logger.info('Password updated successfully', { userId: user.id })

    return { data: { success: true } }

  } catch (error) {
    logger.error('Unexpected error during password update', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
      status: 500
    }
  }
}

/**
 * Verify OTP code from email
 */
export async function verifyOTP(
  email: string,
  token: string
): Promise<AuthResult<{ verified: boolean }>> {
  try {
    if (!email || !token) {
      return { error: 'Email and verification code are required' }
    }

    // Validate token format (6 digits)
    if (!/^\d{6}$/.test(token)) {
      return { error: 'Invalid verification code format' }
    }

    const supabase = await createClient()

    logger.info('Attempting OTP verification', { email })

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: 'signup'
    })

    if (error) {
      logger.error('OTP verification failed', {
        error: error.message,
        email
      })

      if (error.message?.includes('expired')) {
        return {
          error: 'Verification code has expired. Please request a new one',
          code: 'otp_expired',
          status: 410
        }
      }

      if (error.message?.includes('invalid')) {
        return {
          error: 'Invalid verification code',
          code: 'invalid_otp',
          status: 400
        }
      }

      return {
        error: error.message || 'Verification failed',
        code: error.code,
        status: error.status
      }
    }

    logger.info('OTP verified successfully', { email })

    return { data: { verified: true } }

  } catch (error) {
    logger.error('Unexpected error during OTP verification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      email
    })
    return {
      error: 'An unexpected error occurred',
      code: 'unexpected_error',
      status: 500
    }
  }
}

/**
 * Get current authenticated user (for protected pages)
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    logger.error('Error getting current user', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return null
  }
}

/**
 * Refresh session (called by middleware)
 */
export async function refreshSession() {
  try {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      logger.error('Session refresh failed', { error: error.message })
      return null
    }

    return session
  } catch (error) {
    logger.error('Error refreshing session', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return null
  }
}

/**
 * Redirect to a specific path after successful auth
 * Used after server actions complete
 */
export async function redirectTo(path: string) {
  redirect(path)
}