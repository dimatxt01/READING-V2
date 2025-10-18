'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function VerifyOTPContent() {
  const { supabase } = useSupabase()
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailFromUrl = searchParams.get('email')

  const [email, setEmail] = useState(emailFromUrl || '')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!email) {
      setError('Please enter your email address')
      setLoading(false)
      return
    }

    if (otp.length !== 6) {
      setError('Please enter the 6-digit code from your email')
      setLoading(false)
      return
    }

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup'
      })

      if (verifyError) {
        setError(verifyError.message)
        setLoading(false)
      } else {
        // Success! Force navigation to dashboard to avoid reload loop
        window.location.href = '/dashboard'
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('OTP verification error:', err)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Verify Your Email</CardTitle>
          <CardDescription className="text-center">
            Enter the 6-digit code sent to your email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                disabled={loading || !!emailFromUrl}
              />
            </div>

            <div>
              <label htmlFor="otp" className="block text-sm font-medium mb-2">
                6-Digit Code
              </label>
              <Input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setOtp(value)
                }}
                placeholder="000000"
                required
                disabled={loading}
                maxLength={6}
                className="text-center text-2xl tracking-widest font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Check your email for the verification code
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Didn&apos;t receive the code?{' '}
              <button
                type="button"
                onClick={() => router.push('/auth/login')}
                className="text-blue-600 hover:text-blue-800"
              >
                Try signing up again
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  )
}
