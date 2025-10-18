import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const mode = searchParams.get('mode') || 'weighted' // 'weighted' or 'all'

    // Get all active assessments first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allAssessments, error: assessmentError } = await (supabase as any)
      .from('assessment_texts')
      .select('*')
      .eq('active', true)

    if (assessmentError) {
      console.error('Error fetching assessments:', assessmentError)
      return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 })
    }

    // Get user's assessment history (count how many times they took each assessment)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userHistory, error: historyError } = await (supabase as any)
      .from('assessment_results')
      .select('assessment_id')
      .eq('user_id', user.id)

    if (historyError) {
      console.error('Error fetching user history:', historyError)
      // Continue without history data
    }

    // Count how many times user has taken each assessment
    const assessmentCounts = new Map<string, number>()
    if (userHistory) {
      userHistory.forEach((result: { assessment_id: string }) => {
        const count = assessmentCounts.get(result.assessment_id) || 0
        assessmentCounts.set(result.assessment_id, count + 1)
      })
    }

    // Add user-specific take count to each assessment
    interface AssessmentWithUserData {
      id: string
      user_times_taken: number
      [key: string]: unknown
    }

    const assessmentsWithUserData: AssessmentWithUserData[] = allAssessments?.map((assessment: {id: string, [key: string]: unknown}) => ({
      ...assessment,
      user_times_taken: assessmentCounts.get(assessment.id) || 0
    })) || []

    // Sort assessments by priority (less taken = higher priority)
    if (mode === 'weighted') {
      assessmentsWithUserData.sort((a: AssessmentWithUserData, b: AssessmentWithUserData) => {
        // Prioritize assessments the user hasn't taken or taken less
        if (a.user_times_taken !== b.user_times_taken) {
          return a.user_times_taken - b.user_times_taken
        }
        // For same take count, randomize
        return Math.random() - 0.5
      })
    } else {
      // Random shuffle for 'all' mode
      for (let i = assessmentsWithUserData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [assessmentsWithUserData[i], assessmentsWithUserData[j]] =
          [assessmentsWithUserData[j], assessmentsWithUserData[i]]
      }
    }

    // Apply limit
    const limitedAssessments = assessmentsWithUserData.slice(0, limit)

    return NextResponse.json({
      success: true,
      data: limitedAssessments,
      total_available: assessmentsWithUserData.length
    })

  } catch (error) {
    console.error('Error in assessments route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
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