import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminServerClient } from '@/lib/supabase/admin-server'

// POST /api/admin/subscriptions/override - Override user subscription
export async function POST(request: NextRequest) {
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
    const { userId, tier, status, reason, expiresAt } = body

    if (!userId || !tier) {
      return NextResponse.json({ error: 'User ID and tier are required' }, { status: 400 })
    }

    // Validate tier
    if (!['free', 'reader', 'pro'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    // Validate status
    if (status && !['active', 'inactive', 'canceled', 'past_due'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Check if user exists
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, subscription_tier, subscription_status')
      .eq('id', userId)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user subscription
    const updateData: Record<string, unknown> = {
      subscription_tier: tier,
      updated_at: new Date().toISOString()
    }

    if (status) {
      updateData.subscription_status = status
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select('id, full_name, subscription_tier, subscription_status')
      .single()

    if (error) {
      console.error('Error updating user subscription:', error)
      return NextResponse.json({ error: 'Failed to update user subscription' }, { status: 500 })
    }

    // Create user subscription record if it doesn't exist (for future payment integration)
    try {
      const adminClient = await createAdminServerClient()
      await (adminClient
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('user_subscriptions') as any)
        .upsert({
          user_id: userId,
          tier,
          status: status || 'active',
          is_manual_override: true,
          manual_override_reason: reason || 'Admin override',
          expires_at: expiresAt || null,
          created_by: user.id,
          updated_at: new Date().toISOString()
        })
    } catch (subscriptionError) {
      console.error('Failed to create subscription record:', subscriptionError)
      // Don't fail the request if this fails, as the main profile update succeeded
    }

    // Log admin action
    try {
      const adminClient = await createAdminServerClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient.from('admin_activity_log') as any).insert({
        admin_id: user.id,
        action: 'subscription_override',
        entity_type: 'profiles',
        entity_id: userId,
        details: {
          previous_tier: targetUser.subscription_tier,
          new_tier: tier,
          previous_status: targetUser.subscription_status,
          new_status: status || targetUser.subscription_status,
          reason: reason || 'Admin override',
          expires_at: expiresAt,
          timestamp: new Date().toISOString()
        }
      })
    } catch (logError) {
      console.error('Failed to log admin action:', logError)
    }

    return NextResponse.json({ 
      data,
      message: `Successfully updated ${targetUser.full_name || 'user'}'s subscription to ${tier}` 
    })
  } catch (error) {
    console.error('Subscription override API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/admin/subscriptions/override - Get users for override selection
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const tier = searchParams.get('tier')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, subscription_tier, subscription_status, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    // Search by name if provided
    if (search) {
      query = query.ilike('full_name', `%${search}%`)
    }

    // Filter by tier if provided
    if (tier && ['free', 'reader', 'pro'].includes(tier)) {
      query = query.eq('subscription_tier', tier as 'free' | 'reader' | 'pro')
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching users for override:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Subscription override GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}