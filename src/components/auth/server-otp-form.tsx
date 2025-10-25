'use client'

import { verifyOTP } from '@/app/actions/auth'
import { isAuthError } from '@/lib/auth/types'
import { useFormStatus } from 'react-dom'
import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
      {pending ? 'Verifying...' : 'Verify email'}
    </Button>
  )
}

export function ServerOTPForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Move to next input if value entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newOtp = [...otp]

    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i]
    }

    setOtp(newOtp)
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setError('')
    setSuccessMessage('')

    const otpCode = otp.join('')

    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits')
      return
    }

    if (!email) {
      setError('Email is required. Please go back and try again.')
      return
    }

    startTransition(async () => {
      try {
        const result = await verifyOTP(email, otpCode)

        if (isAuthError(result)) {
          setError(result.error)
          return
        }

        setSuccessMessage('Email verified successfully! Redirecting...')

        // Redirect to dashboard after successful verification
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 1500)

      } catch (err) {
        console.error('OTP verification error:', err)
        setError('An unexpected error occurred. Please try again.')
      }
    })
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            We sent a verification code to:
          </p>
          <p className="font-medium text-gray-900 mb-6">{email}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3 text-center">
            Enter verification code
          </label>
          <div className="flex justify-center space-x-2">
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-12 h-12 text-center text-lg font-semibold"
                disabled={isPending}
              />
            ))}
          </div>
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

        <div className="text-center text-sm text-gray-600">
          Didn&apos;t receive the code?{' '}
          <button
            type="button"
            className="text-blue-600 hover:underline"
            onClick={() => {
              // In a real app, implement resend functionality
              alert('Resend functionality would be implemented here')
            }}
            disabled={isPending}
          >
            Resend
          </button>
        </div>
      </form>
    </div>
  )
}