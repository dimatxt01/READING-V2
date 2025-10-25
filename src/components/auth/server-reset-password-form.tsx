'use client'

import { requestPasswordReset } from '@/app/actions/auth'
import { isAuthError } from '@/lib/auth/types'
import { useFormStatus } from 'react-dom'
import { useState, useTransition } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full"
    >
      {pending ? 'Sending...' : 'Send reset link'}
    </Button>
  )
}

export function ServerResetPasswordForm() {
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    setError('')
    setSuccessMessage('')

    const email = formData.get('email') as string

    startTransition(async () => {
      try {
        const result = await requestPasswordReset(email)

        if (isAuthError(result)) {
          setError(result.error)
          return
        }

        // Always show success for security (don't reveal if email exists)
        setSuccessMessage(
          'If an account exists with this email, you will receive a password reset link shortly.'
        )

        // Clear form
        const form = document.getElementById('reset-form') as HTMLFormElement
        form?.reset()

      } catch (err) {
        console.error('Password reset error:', err)
        setError('An unexpected error occurred. Please try again.')
      }
    })
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form
        id="reset-form"
        action={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email address
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

        <SubmitButton />

        <div className="text-center text-sm">
          Remember your password?{' '}
          <a
            href="/auth/login"
            className="text-blue-600 hover:underline"
          >
            Sign in
          </a>
        </div>
      </form>
    </div>
  )
}