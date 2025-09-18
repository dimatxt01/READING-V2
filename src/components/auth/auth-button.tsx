'use client'

import { useSupabase } from '../providers/supabase-provider'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AuthFormProps {
  mode: 'signin' | 'signup'
  onToggleMode: () => void
}

export function AuthForm({ mode, onToggleMode }: AuthFormProps) {
  const { supabase } = useSupabase()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: 'http://localhost:3000/auth/callback',
          },
        })

        if (error) {
          setMessage(error.message)
        } else {
          setMessage('Check your email for a confirmation link!')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setMessage(error.message)
        }
      }
    } catch (error) {
      setMessage('An unexpected error occurred')
      console.error('Auth error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email
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

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
            disabled={loading}
            minLength={6}
          />
        </div>

        {message && (
          <div className={`text-sm p-3 rounded ${
            message.includes('Check your email') 
              ? 'bg-green-50 text-green-800' 
              : 'bg-red-50 text-red-800'
          }`}>
            {message}
          </div>
        )}

        <Button 
          type="submit"
          disabled={loading}
          className="w-full"
        >
          {loading 
            ? (mode === 'signup' ? 'Creating account...' : 'Signing in...') 
            : (mode === 'signup' ? 'Create account' : 'Sign in')
          }
        </Button>

        <div className="text-center space-y-2">
          <button
            type="button"
            onClick={onToggleMode}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-800 block w-full"
          >
            {mode === 'signup' 
              ? 'Already have an account? Sign in' 
              : "Don't have an account? Sign up"
            }
          </button>
          
          {mode === 'signin' && (
            <a
              href="/auth/reset-password"
              className="text-sm text-gray-600 hover:text-gray-800 block"
            >
              Forgot your password?
            </a>
          )}
        </div>
      </form>
    </div>
  )
}

interface SignOutButtonProps {
  className?: string
}

export function SignOutButton({ className }: SignOutButtonProps) {
  const { supabase } = useSupabase()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleSignOut}
      disabled={loading}
      variant="outline"
      className={className}
    >
      {loading ? 'Signing out...' : 'Sign out'}
    </Button>
  )
}