import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin-client'

export async function GET() {
  try {
    const adminClient = createAdminClient()
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assessments, error } = await (adminClient as any)
      .from('assessment_texts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching assessments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch assessments' },
        { status: 500 }
      )
    }

    return NextResponse.json(assessments)
  } catch (error) {
    console.error('Error in GET /api/admin/assessments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, difficulty_level, category } = body // TODO: Implement questions handling

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()
    
    // Calculate word count
    const word_count = content.trim() ? content.trim().split(/\s+/).length : 0
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assessment, error } = await (adminClient as any)
      .from('assessment_texts')
      .insert({
        title,
        content,
        difficulty_level: difficulty_level || 'intermediate',
        category: category || null,
        word_count,
        questions: body.questions || [],
        times_used: 0,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating assessment:', error)
      return NextResponse.json(
        { error: 'Failed to create assessment' },
        { status: 500 }
      )
    }

    return NextResponse.json(assessment, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/admin/assessments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, content, difficulty_level, category } = body

    if (!id || !title || !content) {
      return NextResponse.json(
        { error: 'ID, title and content are required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()
    
    // Calculate word count
    const word_count = content.trim() ? content.trim().split(/\s+/).length : 0
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assessment, error } = await (adminClient as any)
      .from('assessment_texts')
      .update({
        title,
        content,
        difficulty_level: difficulty_level || 'intermediate',
        category: category || null,
        word_count,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating assessment:', error)
      return NextResponse.json(
        { error: 'Failed to update assessment' },
        { status: 500 }
      )
    }

    return NextResponse.json(assessment)
  } catch (error) {
    console.error('Error in PUT /api/admin/assessments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Assessment ID is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()
    
    // First, delete associated questions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('assessment_questions')
      .delete()
      .eq('assessment_text_id', id)
    
    // Then delete the assessment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any)
      .from('assessment_texts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting assessment:', error)
      return NextResponse.json(
        { error: 'Failed to delete assessment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/assessments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}