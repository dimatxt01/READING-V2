import { NextRequest, NextResponse } from 'next/server'
import { createAdminServerClient } from '@/lib/supabase/admin-server'
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

    // Get user's recent assessment results
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: results, error } = await (supabase as any)
      .from('assessment_results')
      .select(`
        *,
        assessment_texts!inner(
          title
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching assessment results:', error)
      return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: results || []
    })

  } catch (error) {
    console.error('Error in GET /api/assessments/results:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      assessment_text_id, 
      reading_time_seconds, 
      reading_speed, 
      user_answers 
    } = body

    if (!assessment_text_id || !reading_time_seconds || !reading_speed || !user_answers) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createAdminServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get assessment text for webhook scoring
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assessment, error: assessmentError } = await (supabase as any)
      .from('assessment_texts')
      .select('content, questions')
      .eq('id', assessment_text_id)
      .single()

    if (assessmentError || !assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      )
    }

    // Call external webhook for scoring
    const comprehensionScore = await callScoringWebhook(
      assessment.content,
      assessment.questions,
      user_answers
    )

    // Calculate correct answers count  
    const correctAnswers = user_answers.filter((answer: {
      user_answer: string
      correct_answer: string
    }) => answer.user_answer === answer.correct_answer).length

    // Save results to database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('assessment_results')
      .insert({
        user_id: user.id,
        assessment_id: assessment_text_id,
        wpm: reading_speed,
        comprehension_percentage: comprehensionScore,
        time_taken: reading_time_seconds,
        answers: user_answers
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving assessment result:', error)
      return NextResponse.json(
        { error: 'Failed to save assessment result' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ...data,
      comprehension_score: comprehensionScore,
      correct_answers: correctAnswers,
      total_questions: user_answers.length
    })

  } catch (error) {
    console.error('Error in POST /api/assessments/results:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// External webhook scoring function
async function callScoringWebhook(
  text: string, 
  questions: Array<{
    question: string
    options: string[]
    correct_answer: string
  }>, 
  user_answers: Array<{
    question: string
    correct_answer: string
    user_answer: string
    options: string[]
  }>
): Promise<number> {
  try {
    // For now, this is mocked. Replace with actual external webhook URL
    // TODO: Implement webhook integration with external scoring service
    // const WEBHOOK_URL = process.env.SCORING_WEBHOOK_URL || 'https://api.example.com/score'
    // const payload = {
    //   text,
    //   questions: user_answers.map(answer => ({
    //     question: answer.question,
    //     options: answer.options,
    //     correct_answer: answer.correct_answer,
    //     user_answer: answer.user_answer
    //   }))
    // }

    // Mock external API call (remove this when using real webhook)
    if (!process.env.SCORING_WEBHOOK_URL) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Calculate simple percentage based on correct answers
      const correctCount = user_answers.filter(a => a.user_answer === a.correct_answer).length
      const baseScore = Math.round((correctCount / user_answers.length) * 100)
      
      // Add some variability to simulate more sophisticated scoring
      const variation = Math.floor(Math.random() * 10) - 5 // -5 to +5
      return Math.max(0, Math.min(100, baseScore + variation))
    }

    // Real webhook call (uncomment when using actual service)
    /*
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SCORING_WEBHOOK_API_KEY || ''}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response.ok) {
      throw new Error(`Webhook responded with status: ${response.status}`)
    }

    const result = await response.json()
    
    // Expecting webhook to return a score like "78" or { score: 78 }
    if (typeof result === 'string' && !isNaN(parseInt(result))) {
      return parseInt(result)
    } else if (typeof result === 'object' && result.score) {
      return parseInt(result.score)
    } else if (typeof result === 'number') {
      return Math.round(result)
    }
    
    throw new Error('Invalid response format from scoring webhook')
    */

    // Fallback for now
    const correctCount = user_answers.filter(a => a.user_answer === a.correct_answer).length
    return Math.round((correctCount / user_answers.length) * 100)

  } catch (error) {
    console.error('Error calling scoring webhook:', error)
    
    // Fallback to simple scoring if webhook fails
    const correctCount = user_answers.filter(a => a.user_answer === a.correct_answer).length
    return Math.round((correctCount / user_answers.length) * 100)
  }
}