import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminServerClient } from '@/lib/supabase/admin-server'

// GET /api/admin/exercises/texts - Get all exercise texts
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
    const exerciseId = searchParams.get('exerciseId')

    // Get exercise texts with related data
    const adminClient = await createAdminServerClient()
    let query = adminClient
      .from('exercise_texts')
      .select('*')
      .order('created_at', { ascending: false })

    if (exerciseId) {
      query = query.eq('exercise_id', exerciseId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching exercise texts:', error)
      return NextResponse.json({ error: 'Failed to fetch exercise texts' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Exercise texts API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/exercises/texts - Create new exercise text
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
      exercise_id,
      book_id,
      title,
      text_content,
      difficulty_level,
      is_custom
    } = body

    if (!exercise_id || !title || !text_content) {
      return NextResponse.json({ 
        error: 'Exercise ID, title, and text content are required' 
      }, { status: 400 })
    }

    // Calculate word count
    const word_count = text_content.trim().split(/\s+/).length

    // Create new exercise text
    const adminClient = await createAdminServerClient()
    const { data, error } = await (adminClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('exercise_texts') as any)
      .insert({
        exercise_id,
        book_id: book_id || null,
        title,
        text_content,
        word_count,
        difficulty_level: difficulty_level || 'intermediate',
        is_custom: is_custom || false,
        created_by: user.id,
        created_at: new Date().toISOString()
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating exercise text:', error)
      return NextResponse.json({ error: 'Failed to create exercise text' }, { status: 500 })
    }

    // Log admin action
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient.from('admin_activity_log') as any).insert({
        admin_id: user.id,
        action: 'create_exercise_text',
        entity_type: 'exercise_texts',
        entity_id: data.id,
        details: {
          title,
          exercise_id,
          word_count,
          timestamp: new Date().toISOString()
        }
      })
    } catch (logError) {
      console.error('Failed to log admin action:', logError)
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Exercise text creation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/exercises/texts/[id] - Update exercise text
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Text ID is required' }, { status: 400 })
    }

    const body = await request.json()

    // Recalculate word count if text content is updated
    if (body.text_content) {
      body.word_count = body.text_content.trim().split(/\s+/).length
    }

    // Update exercise text
    const adminClient = await createAdminServerClient()
    const { data, error } = await (adminClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('exercise_texts') as any)
      .update(body)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating exercise text:', error)
      return NextResponse.json({ error: 'Failed to update exercise text' }, { status: 500 })
    }

    // Log admin action
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient.from('admin_activity_log') as any).insert({
        admin_id: user.id,
        action: 'update_exercise_text',
        entity_type: 'exercise_texts',
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
    console.error('Exercise text update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/exercises/texts/[id] - Delete exercise text
export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Text ID is required' }, { status: 400 })
    }

    // Delete exercise text
    const adminClient = await createAdminServerClient()
    const { error } = await (adminClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('exercise_texts') as any)
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting exercise text:', error)
      return NextResponse.json({ error: 'Failed to delete exercise text' }, { status: 500 })
    }

    // Log admin action
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient.from('admin_activity_log') as any).insert({
        admin_id: user.id,
        action: 'delete_exercise_text',
        entity_type: 'exercise_texts',
        entity_id: id,
        details: {
          timestamp: new Date().toISOString()
        }
      })
    } catch (logError) {
      console.error('Failed to log admin action:', logError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Exercise text delete API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}