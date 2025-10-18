'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function AuthCodeErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-red-600">
            Authentication Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              {error === 'missing_parameters'
                ? 'The verification link is missing required parameters.'
                : error === 'invalid request: both auth code and code verifier should be non-empty'
                ? 'This verification link has expired or was opened in a different browser. Please request a new verification email.'
                : error
                ? `Error: ${error}`
                : 'An error occurred during authentication.'}
            </p>

            {error?.includes('code verifier') && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-left">
                <p className="font-semibold mb-2">Why did this happen?</p>
                <p className="text-muted-foreground">
                  Email verification links must be opened in the same browser where you signed up.
                  If you cleared cookies or opened this link in a different browser, the verification will fail.
                </p>
              </div>
            )}

            <div className="space-y-2 pt-4">
              <Button asChild className="w-full">
                <Link href="/auth/login">
                  Return to Login
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                Need to sign up again?{' '}
                <Link href="/auth/login" className="text-blue-600 hover:text-blue-800">
                  Create a new account
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    }>
      <AuthCodeErrorContent />
    </Suspense>
  )
}
