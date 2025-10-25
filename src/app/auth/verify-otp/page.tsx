'use client'

import { Suspense } from 'react'
import { ServerOTPForm } from '@/components/auth/server-otp-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function VerifyOTPPage() {
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
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <ServerOTPForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}