import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin-client'

export async function GET() {
  try {
    const adminClient = createAdminClient()
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (adminClient as any)
      .from('subscription_tier_limits')
      .select('*')
      .order('tier_name')
    
    if (error) throw error
    
    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error fetching subscription tier limits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription tier limits' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { tier_name, limits } = body
    
    if (!tier_name || !limits) {
      return NextResponse.json(
        { error: 'Missing tier_name or limits' },
        { status: 400 }
      )
    }
    
    const adminClient = createAdminClient()
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any)
      .from('subscription_tier_limits')
      .update({
        monthly_assessment_limit: limits.monthly_assessment_limit,
        daily_assessment_limit: limits.daily_assessment_limit,
        updated_at: new Date().toISOString()
      })
      .eq('tier_name', tier_name)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating subscription tier limits:', error)
    return NextResponse.json(
      { error: 'Failed to update subscription tier limits' },
      { status: 500 }
    )
  }
}