import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is authenticated, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-8">
        <BookOpen className="h-20 w-20 mx-auto text-primary" />

        <div className="space-y-3">
          <h1 className="text-6xl font-bold">ReadSpeed</h1>
          <p className="text-xl text-muted-foreground">Track your reading progress</p>
        </div>

        <Link
          href="/auth/login"
          className="inline-block px-8 py-3 text-lg font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Get Started
        </Link>
      </div>
    </div>
  )
}
