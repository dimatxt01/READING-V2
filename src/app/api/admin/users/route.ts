import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/users - Get all users with emails
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search') || ''
    const roleFilter = searchParams.get('role') || 'all'
    const subscriptionFilter = searchParams.get('subscription') || 'all'
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Query profiles table and build filter
    let profileQuery = supabase
      .from('profiles')
      .select('*')

    // Apply filters
    if (roleFilter !== 'all') {
      profileQuery = profileQuery.eq('role', roleFilter)
    }

    if (subscriptionFilter !== 'all') {
      profileQuery = profileQuery.eq('subscription_tier', subscriptionFilter)
    }

    if (searchQuery) {
      profileQuery = profileQuery.or(`full_name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`)
    }

    // Add sorting
    const validSortColumns = ['created_at', 'full_name', 'role', 'subscription_tier', 'updated_at']
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at'
    profileQuery = profileQuery.order(sortColumn, { ascending: sortOrder === 'asc' })

    const { data: profiles, error: profilesError } = await profileQuery

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    // Format users data (email will be fetched if needed via direct query)
    const formattedUsers = (profiles || []).map(p => ({
      id: p.id,
      email: null, // Email would require auth.users access or MCP tool
      full_name: p.full_name || null,
      city: p.city || null,
      avatar_url: p.avatar_url || null,
      role: p.role || 'reader',
      subscription_tier: p.subscription_tier || 'free',
      is_active: true, // Default to true since profiles table doesn't have this field
      created_at: p.created_at,
      updated_at: p.updated_at,
      last_login: null, // Would require auth.users access
    }))

    return NextResponse.json({
      users: formattedUsers,
      total: formattedUsers.length,
      page: 1,
      limit: formattedUsers.length
    })

  } catch (error) {
    console.error('Error in admin users API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/users - Update user properties (role, subscription, status)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, role, subscription_tier } = body

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Build update object with only provided fields
    const updateData: {
      updated_at: string
      role?: string
      subscription_tier?: string
    } = {
      updated_at: new Date().toISOString()
    }

    if (role !== undefined) {
      updateData.role = role
    }

    if (subscription_tier !== undefined) {
      updateData.subscription_tier = subscription_tier
    }

    // Use admin client to bypass RLS and update the user's profile
    const adminClient = createAdminClient()
    const { error: updateError } = await adminClient
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user:', updateError)
      throw updateError
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in admin users PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}