import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminServerClient } from '@/lib/supabase/admin-server'

// GET /api/admin/subscriptions/limits - Get all subscription limits
export async function GET() {
  const supabase = await createClient()

  try {
    // Check admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all subscription limits
    const adminClient = await createAdminServerClient()
    const { data, error } = await adminClient
      .from('subscription_limits')
      .select('*')
      .order('tier')

    if (error) {
      console.error('Error fetching subscription limits:', error)
      return NextResponse.json({ error: 'Failed to fetch subscription limits' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Subscription limits API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/subscriptions/limits - Update subscription limits
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  try {
    // Check admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { tier, limits } = body

    if (!tier || !limits) {
      return NextResponse.json({ error: 'Tier and limits are required' }, { status: 400 })
    }

    // Validate tier
    if (!['free', 'reader', 'pro'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    // Update subscription limits
    const adminClient = await createAdminServerClient()
    const { data, error } = await (adminClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('subscription_limits') as any)
      .update({
        ...limits,
        updated_at: new Date().toISOString()
      })
      .eq('tier', tier)
      .select()
      .single()

    if (error) {
      console.error('Error updating subscription limits:', error)
      return NextResponse.json({ error: 'Failed to update subscription limits' }, { status: 500 })
    }

    // Log admin action
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient.from('admin_activity_log') as any).insert({
        admin_id: user.id,
        action: 'update_subscription_limits',
        entity_type: 'subscription_limits',
        entity_id: data.id,
        details: {
          tier,
          changes: limits,
          timestamp: new Date().toISOString()
        }
      })
    } catch (logError) {
      console.error('Failed to log admin action:', logError)
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Subscription limits update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}