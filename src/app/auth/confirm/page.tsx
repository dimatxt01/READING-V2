'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function ConfirmEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { supabase } = useSupabase()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const token_hash = searchParams.get('token_hash')
        const type = searchParams.get('type')

        if (!token_hash || type !== 'signup') {
          setError('Invalid confirmation link')
          setLoading(false)
          return
        }

        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'signup'
        })

        if (error) {
          setError(error.message)
        } else {
          setConfirmed(true)
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        }
      } catch (err) {
        setError('An unexpected error occurred')
        console.error('Confirmation error:', err)
      } finally {
        setLoading(false)
      }
    }

    confirmEmail()
  }, [searchParams, supabase.auth, router])

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">
          {loading ? 'Confirming Email...' : 
           confirmed ? 'Email Confirmed!' : 
           'Confirmation Failed'}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        {loading && (
          <div className="text-muted-foreground">
            Please wait while we confirm your email address...
          </div>
        )}
        
        {confirmed && (
          <div className="space-y-4">
            <div className="text-green-600">
              ✅ Your email has been successfully confirmed!
            </div>
            <div className="text-muted-foreground">
              Redirecting you to your dashboard...
            </div>
          </div>
        )}
        
        {error && (
          <div className="space-y-4">
            <div className="text-red-600">
              ❌ {error}
            </div>
            <Button onClick={() => router.push('/auth/login')}>
              Return to Login
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ConfirmPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <div>Loading...</div>
          </CardContent>
        </Card>
      }>
        <ConfirmEmailContent />
      </Suspense>
    </div>
  )
}