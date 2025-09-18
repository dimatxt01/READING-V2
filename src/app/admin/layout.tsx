import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar'
import { AdminHeader } from '@/components/admin/layout/AdminHeader'
import { AdminBreadcrumb } from '@/components/admin/layout/AdminBreadcrumb'

export const metadata = {
  title: 'Admin Panel - ReadSpeed',
  description: 'Administrative dashboard for ReadSpeed application management',
}

async function checkAdminAccess() {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      redirect('/auth/login')
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      redirect('/dashboard?error=unauthorized')
    }

    // Log admin access (when logging table is available)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('admin_activity_log').insert({
        admin_id: user.id,
        action: 'admin_panel_access',
        entity_type: 'system',
        details: {
          user_agent: 'web',
          timestamp: new Date().toISOString()
        }
      })
    } catch {
      // Ignore logging errors for now (table might not exist yet)
      console.debug('Admin logging not available yet')
    }

    return user
  } catch (error) {
    console.error('Admin access check failed:', error)
    redirect('/dashboard?error=access_denied')
  }
}

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await checkAdminAccess()

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <AdminSidebar className="hidden lg:flex" />
        
        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <AdminHeader />
          
          {/* Breadcrumb */}
          <AdminBreadcrumb />
          
          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-6 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
      
    </div>
  )
}