import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminServerClient } from '@/lib/supabase/admin-server'
import type { Exercise } from '@/lib/types/database-extensions'

// GET /api/admin/exercises/[id] - Get single exercise
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

    // Get exercise
    const adminClient = await createAdminServerClient()
    const { data, error } = await adminClient
      .from('exercises')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching exercise:', error)
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Exercise GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/exercises/[id] - Update exercise
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
    
    // Build update object with only valid fields
    const updateData: Partial<Exercise> = {
      updated_at: new Date().toISOString()
    }
    
    // Add fields from body if they exist
    if (body.title) updateData.title = body.title
    if (body.description) updateData.description = body.description
    if (body.type) updateData.type = body.type
    if (body.difficulty) updateData.difficulty = body.difficulty
    if (body.tags) updateData.tags = body.tags
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.requires_subscription !== undefined) updateData.requires_subscription = body.requires_subscription
    if (body.min_subscription_tier) updateData.min_subscription_tier = body.min_subscription_tier
    if (body.instructions) updateData.instructions = body.instructions
    if (body.config) updateData.config = body.config
    
    // Update exercise  
    const adminClient = await createAdminServerClient()
    const { data, error } = await (adminClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('exercises') as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating exercise:', error)
      return NextResponse.json({ error: 'Failed to update exercise' }, { status: 500 })
    }

    // Log admin action
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient.from('admin_activity_log') as any).insert({
        admin_id: user.id,
        action: 'update_exercise',
        entity_type: 'exercises',
        entity_id: id,
        details: {
          changes: body,
          timestamp: new Date().toISOString()
        }
      })
    } catch (logError) {
      console.error('Failed to log admin action:', logError)
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Exercise update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/exercises/[id] - Delete exercise
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

    // Soft delete by setting is_active to false
    const adminClient = await createAdminServerClient()
    const { data, error } = await (adminClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('exercises') as any)
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error deleting exercise:', error)
      return NextResponse.json({ error: 'Failed to delete exercise' }, { status: 500 })
    }

    // Log admin action
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient.from('admin_activity_log') as any).insert({
        admin_id: user.id,
        action: 'delete_exercise',
        entity_type: 'exercises',
        entity_id: id,
        details: {
          timestamp: new Date().toISOString()
        }
      })
    } catch (logError) {
      console.error('Failed to log admin action:', logError)
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Exercise delete API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}