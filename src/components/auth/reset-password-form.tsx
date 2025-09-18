'use client'

import { useState } from 'react'
import { useSupabase } from '../providers/supabase-provider'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import Link from 'next/link'

export function ResetPasswordForm() {
  const { supabase } = useSupabase()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `http://localhost:3000/auth/update-password`,
      })

      if (error) {
        setMessage(error.message)
      } else {
        setSent(true)
        setMessage('Check your email for a password reset link!')
      }
    } catch (error) {
      setMessage('An unexpected error occurred')
      console.error('Password reset error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">Reset Password</CardTitle>
      </CardHeader>
      <CardContent>
        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                disabled={loading}
              />
            </div>

            {message && (
              <div className="text-sm p-3 rounded bg-red-50 text-red-800">
                {message}
              </div>
            )}

            <Button 
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>

            <div className="text-center">
              <Link 
                href="/auth/login" 
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Back to login
              </Link>
            </div>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="text-green-600">
              ✅ Password reset link sent!
            </div>
            <div className="text-sm text-muted-foreground">
              Check your email and click the link to reset your password.
            </div>
            <Link href="/auth/login">
              <Button variant="outline" className="w-full">
                Return to login
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}