import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin-client'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '1')

    // Get active assessments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assessments, error } = await (supabase as any)
      .from('assessment_texts')
      .select('*')
      .eq('active', true)
      .limit(limit)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching assessments:', error)
      return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: assessments
    })

  } catch (error) {
    console.error('Error in assessments route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      assessment_id,
      wpm,
      comprehension_percentage,
      time_taken,
      answers,
      text_content,
      questions
    } = body

    // Validate required fields
    if (!assessment_id || !wpm || comprehension_percentage === undefined || !time_taken || !answers) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    // Save assessment result
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error: insertError } = await (supabase as any)
      .from('assessment_results')
      .insert({
        user_id: user.id,
        assessment_id: assessment_id,
        wpm,
        comprehension_percentage,
        time_taken,
        answers,
        percentile: null // This would be calculated by a background job
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error saving assessment result:', insertError)
      return NextResponse.json({ error: 'Failed to save assessment result' }, { status: 500 })
    }

    // Call external webhook if text and questions are provided
    let webhookResult = null
    if (text_content && questions && Array.isArray(questions)) {
      try {
        const webhookResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/assessments/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text_content,
            questions: questions,
            answers: answers
          })
        })

        if (webhookResponse.ok) {
          const webhookData = await webhookResponse.json()
          webhookResult = webhookData.result
        }
      } catch (webhookError) {
        console.error('Webhook call failed:', webhookError)
        // Continue without webhook result - don't fail the main request
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      webhook_result: webhookResult,
      message: 'Assessment result saved successfully'
    })

  } catch (error) {
    console.error('Error in assessment submission:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}