'use client'

import { signIn, signUp } from '@/app/actions/auth'
import { isAuthError } from '@/lib/auth/types'
import { useFormStatus } from 'react-dom'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

interface ServerAuthFormProps {
  mode: 'signin' | 'signup'
  onToggleMode: () => void
}

function SubmitButton({ mode }: { mode: 'signin' | 'signup' }) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full"
    >
      {pending ? (
        mode === 'signin' ? 'Signing in...' : 'Creating account...'
      ) : (
        mode === 'signin' ? 'Sign in' : 'Sign up'
      )}
    </Button>
  )
}

export function ServerAuthForm({ mode, onToggleMode }: ServerAuthFormProps) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    // Clear previous messages
    setError('')
    setSuccessMessage('')

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    startTransition(async () => {
      try {
        if (mode === 'signin') {
          const result = await signIn(email, password)

          if (isAuthError(result)) {
            setError(result.error)
            return
          }

          // Success! Server-side redirect will happen automatically
          setSuccessMessage('Login successful! Redirecting...')

          // Fallback client-side redirect after a delay
          // This should not be needed if server redirect works
          setTimeout(() => {
            router.push('/dashboard')
            router.refresh()
          }, 1500)

        } else {
          const result = await signUp(email, password)

          if (isAuthError(result)) {
            setError(result.error)
            return
          }

          if (result.data.requiresEmailVerification) {
            // Redirect to OTP verification page
            setSuccessMessage('Account created! Check your email for verification.')
            setTimeout(() => {
              router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}`)
            }, 1500)
          } else {
            // Direct sign in (shouldn't happen with email verification)
            setSuccessMessage('Account created! Redirecting...')
            setTimeout(() => {
              router.push('/dashboard')
              router.refresh()
            }, 1500)
          }
        }
      } catch (err) {
        console.error('Auth error:', err)
        setError('An unexpected error occurred. Please try again.')
      }
    })
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form action={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="your.email@example.com"
            required
            disabled={isPending}
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
            required
            disabled={isPending}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={mode === 'signup' ? 6 : undefined}
          />
        </div>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded">
            {successMessage}
          </div>
        )}

        <SubmitButton mode={mode} />

        <div className="text-center text-sm">
          {mode === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={onToggleMode}
                className="text-blue-600 hover:underline"
                disabled={isPending}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={onToggleMode}
                className="text-blue-600 hover:underline"
                disabled={isPending}
              >
                Sign in
              </button>
            </>
          )}
        </div>

        {mode === 'signin' && (
          <div className="text-center">
            <a
              href="/auth/reset-password"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Forgot your password?
            </a>
          </div>
        )}
      </form>
    </div>
  )
}