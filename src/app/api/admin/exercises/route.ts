import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminServerClient } from '@/lib/supabase/admin-server'

// GET /api/admin/exercises - Get all exercises
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
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Get all exercises
    const adminClient = await createAdminServerClient()
    let query = adminClient
      .from('exercises')
      .select('*')
      .order('created_at', { ascending: false })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching exercises:', error)
      return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Exercises API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/exercises - Create new exercise
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
    const { 
      title, 
      type, 
      difficulty, 
      description, 
      tags, 
      min_subscription_tier,
      instructions,
      config,
      is_active 
    } = body

    if (!title || !type || !difficulty || !description) {
      return NextResponse.json({ 
        error: 'Title, type, difficulty, and description are required' 
      }, { status: 400 })
    }

    // Create new exercise
    const adminClient = await createAdminServerClient()
    const { data, error } = await (adminClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('exercises') as any)
      .insert({
        name: title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        type,
        difficulty_level: difficulty,
        description,
        tags: tags || [],
        requires_subscription: min_subscription_tier || 'free',
        instructions: instructions || null,
        settings: config || {},
        is_active: is_active !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating exercise:', error)
      return NextResponse.json({ error: 'Failed to create exercise' }, { status: 500 })
    }

    // Log admin action
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient.from('admin_activity_log') as any).insert({
        admin_id: user.id,
        action: 'create_exercise',
        entity_type: 'exercises',
        entity_id: data.id,
        details: {
          title,
          type,
          timestamp: new Date().toISOString()
        }
      })
    } catch (logError) {
      console.error('Failed to log admin action:', logError)
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Exercise creation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}