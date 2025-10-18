import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token = searchParams.get('token')  // PKCE token from email links
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard'

  const supabase = await createClient()

  // Handle PKCE flow with token parameter (from email verification links)
  if (token && type) {
    console.log('Processing PKCE token verification:', { type, token: token.substring(0, 20) + '...' })

    // Try verifyOtp first (for proper PKCE flow)
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as 'email' | 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change',
    })

    if (!verifyError) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      console.log('PKCE token verified successfully, redirecting to:', next)
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } else {
      console.error('Error verifying PKCE token:', verifyError.message)

      // If it's a code verifier error, provide helpful message
      if (verifyError.message.includes('code verifier') || verifyError.message.includes('code_verifier')) {
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(verifyError.message)}`)
      }

      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(verifyError.message)}`)
    }
  }

  // Handle PKCE flow (code exchange)
  if (code) {
    console.log('Processing code exchange')
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      console.log('Code exchanged successfully, redirecting to:', next)
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } else {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`)
    }
  }

  // Handle email verification with token_hash (for email confirmations)
  if (token_hash && type) {
    console.log('Processing token_hash verification:', { type })
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email' | 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change',
    })

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      console.log('Token hash verified successfully, redirecting to:', next)
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } else {
      console.error('Error verifying OTP:', error)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`)
    }
  }

  // No valid auth parameters found
  console.error('No valid auth parameters found:', { code, token, token_hash, type })
  return NextResponse.redirect(`${origin}/auth/auth-code-error?error=missing_parameters`)
}