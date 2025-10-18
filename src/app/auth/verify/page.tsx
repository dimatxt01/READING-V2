'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * This page helps users who click email verification links
 * It automatically redirects to localhost in development
 */
export default function VerifyRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Get the current URL parameters
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const tokenHash = params.get('token_hash')
    const type = params.get('type')

    // Build the callback URL with all parameters
    const callbackParams = new URLSearchParams()
    if (code) callbackParams.set('code', code)
    if (tokenHash) callbackParams.set('token_hash', tokenHash)
    if (type) callbackParams.set('type', type)

    // Redirect to the callback handler
    const callbackUrl = `/auth/callback?${callbackParams.toString()}`
    router.replace(callbackUrl)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="text-muted-foreground">Verifying your email...</p>
      </div>
    </div>
  )
}
