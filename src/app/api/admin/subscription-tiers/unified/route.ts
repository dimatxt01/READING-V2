import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminServerClient } from '@/lib/supabase/admin-server'

// Optimized unified endpoint for subscription tier management
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

    // Single optimized query for all tier data
    const adminClient = await createAdminServerClient()
    
    const { data: subscriptionLimits, error: subscriptionError } = await adminClient
      .from('subscription_limits')
      .select('*')
      .order('tier')

    if (subscriptionError) throw subscriptionError

    // Optimized data structure - flat and efficient
    const tiers = ['free', 'reader', 'pro'].map(tier => {
      const subscriptionLimit = subscriptionLimits?.find((s: any) => s.tier === tier) // eslint-disable-line @typescript-eslint/no-explicit-any

      return {
        id: tier,
        name: tier.charAt(0).toUpperCase() + tier.slice(1),
        subscription: subscriptionLimit ? mapDatabaseToFrontend(subscriptionLimit) : getDefaultSubscriptionLimits(tier),
        hasChanges: false, // Client-side tracking
        isLoading: false   // Client-side tracking
      }
    })

    return NextResponse.json({ 
      success: true,
      data: tiers,
      timestamp: Date.now() // For cache busting
    })

  } catch (error) {
    console.error('Unified subscription tiers API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
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
    const { tier, type, data: updateData } = body

    if (!tier || !type || !updateData) {
      return NextResponse.json({ 
        error: 'Missing required fields: tier, type, data' 
      }, { status: 400 })
    }

    const adminClient = await createAdminServerClient()

    // Only handle subscription updates
    if (type !== 'subscription') {
      return NextResponse.json({ 
        error: 'Invalid type. Only "subscription" is supported' 
      }, { status: 400 })
    }

    // Map frontend field names to database column names
    const mappedData = mapSubscriptionFields(updateData as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    
    const result = await (adminClient as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from('subscription_limits')
      .update({
        ...mappedData,
        updated_at: new Date().toISOString()
      })
      .eq('tier', tier)
      .select()
      .single()

    if (result.error) throw result.error

    // Log admin action
    try {
      await (adminClient as any).from('admin_activity_log').insert({ // eslint-disable-line @typescript-eslint/no-explicit-any
        admin_id: user.id,
        action: `update_${type}_limits`,
        entity_type: `${type}_limits`,
        entity_id: result.data?.id,
        details: {
          tier,
          type,
          changes: updateData,
          timestamp: new Date().toISOString()
        }
      })
    } catch (logError) {
      console.error('Failed to log admin action:', logError)
    }

    return NextResponse.json({ 
      success: true,
      data: result.data,
      message: `${tier.charAt(0).toUpperCase() + tier.slice(1)} ${type} limits updated successfully`
    })

  } catch (error) {
    console.error('Subscription tiers update error:', error)
    return NextResponse.json({ 
      error: 'Failed to update tier limits',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper functions for default values
function getDefaultSubscriptionLimits(tier: string) {
  return {
    tier,
    monthly_reading_limit: tier === 'free' ? 30 : tier === 'reader' ? 100 : null,
    can_see_leaderboard: true,
    can_join_leaderboard: tier !== 'free',
    can_see_book_stats: tier === 'pro',
    can_export_data: tier === 'pro',
    visible_user_stats: getDefaultUserStats(tier),
    visible_book_stats: getDefaultBookStats(tier),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

function getDefaultUserStats(tier: string) {
  if (tier === 'free') return { total_users: true }
  if (tier === 'reader') return { total_users: true, active_users: true }
  return { total_users: true, active_users: true, conversion_rate: true, retention_rate: true }
}

function getDefaultBookStats(tier: string) {
  if (tier === 'free') return { reader_count: true }
  if (tier === 'reader') return { reader_count: true, avg_rating: true }
  return { 
    reader_count: true, 
    avg_rating: true, 
    avg_reading_speed: true, 
    completion_rate: true, 
    session_analytics: true 
  }
}

// Helper function to map frontend field names to database column names
function mapSubscriptionFields(data: any): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  const mapped: any = {} // eslint-disable-line @typescript-eslint/no-explicit-any
  
  // Field mapping from frontend to database
  const fieldMap: Record<string, string> = {
    // Reading limits
    'monthly_reading_limit': 'max_submissions_per_month',
    
    // Feature flags - direct mapping
    'can_see_leaderboard': 'can_see_leaderboard',
    'can_join_leaderboard': 'can_join_leaderboard',
    'can_see_book_stats': 'can_see_book_stats',
    'can_export_data': 'can_export_data',
    
    // JSONB fields - direct mapping
    'visible_user_stats': 'visible_user_stats',
    'visible_book_stats': 'visible_book_stats'
  }
  
  // Apply field mapping
  for (const [frontendKey, dbKey] of Object.entries(fieldMap)) {
    if (data.hasOwnProperty(frontendKey)) {
      const value = data[frontendKey]
      mapped[dbKey] = value
    }
  }
  
  // Handle any unmapped fields (pass through as-is)
  for (const [key, value] of Object.entries(data)) {
    const frontendKeys = Object.keys(fieldMap)
    if (!frontendKeys.includes(key)) {
      // Check if it's already a database column name
      const dbColumns = [
        'max_submissions_per_month', 'max_custom_texts', 'max_exercises',
        'can_see_leaderboard', 'can_join_leaderboard', 'can_see_book_stats',
        'can_export_data', 'visible_user_stats', 'visible_book_stats',
        'can_leave_reviews', 'max_reviews_per_month', 'metadata'
      ]
      if (dbColumns.includes(key)) {
        mapped[key] = value
      }
    }
  }
  
  return mapped
}

// Helper function to map database fields back to frontend field names
function mapDatabaseToFrontend(dbData: any): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    tier: dbData.tier,
    monthly_reading_limit: dbData.max_submissions_per_month,
    can_see_leaderboard: dbData.can_see_leaderboard || false,
    can_join_leaderboard: dbData.can_join_leaderboard || false,
    can_see_book_stats: dbData.can_see_book_stats || false,
    can_export_data: dbData.can_export_data || false,
    visible_user_stats: dbData.visible_user_stats || {},
    visible_book_stats: dbData.visible_book_stats || {},
    created_at: dbData.created_at,
    updated_at: dbData.updated_at
  }
}