import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SidebarNavigation } from '@/components/layout/sidebar-navigation'
import { MobileNavigation } from '@/components/layout/mobile-navigation'
import { MobileDrawer } from '@/components/layout/mobile-drawer'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <SidebarNavigation user={user} profile={profile} />
      <MobileDrawer user={user} profile={profile} />
      <MobileNavigation user={user} profile={profile} />
      
      {/* Main content with responsive margins */}
      <main className="lg:ml-64 min-h-screen pt-0 lg:pt-0 pb-16 lg:pb-0">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}