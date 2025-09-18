import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubmissionFormEnhanced } from '@/components/reading/submission-form-enhanced'
import { SubmissionHistory } from '@/components/reading/submission-history'

export default async function SubmitPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Submit Reading</h1>
        <p className="text-muted-foreground">
          Track your reading progress by submitting pages and time spent.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Submission Form */}
        <div>
          <SubmissionFormEnhanced />
        </div>

        {/* Submission History */}
        <div>
          <SubmissionHistory userId={user.id} />
        </div>
      </div>
    </div>
  )
}