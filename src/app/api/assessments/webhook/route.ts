import { NextRequest, NextResponse } from 'next/server'

interface WebhookPayload {
  text: string
  questions: string[]
  answers: string[]
}

export async function POST(request: NextRequest) {
  try {
    const payload: WebhookPayload = await request.json()
    
    // Validate payload
    if (!payload.text || !payload.questions || !payload.answers) {
      return NextResponse.json(
        { error: 'Missing required fields: text, questions, answers' },
        { status: 400 }
      )
    }

    if (payload.questions.length !== payload.answers.length) {
      return NextResponse.json(
        { error: 'Questions and answers arrays must have the same length' },
        { status: 400 }
      )
    }

    // Mock external webhook call as requested
    // In real implementation, this would call an external service
    const mockResult = await mockExternalWebhook(payload)
    
    return NextResponse.json({ 
      success: true,
      result: mockResult,
      message: 'Assessment processed successfully'
    })

  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Mock external webhook function that returns result in format "78" as specified
async function mockExternalWebhook(payload: WebhookPayload): Promise<string> {
  // Simulate external API call delay
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  // Mock sophisticated text analysis
  const questionCount = payload.questions.length
  
  // Analyze answer quality based on text characteristics
  let totalScore = 0
  
  payload.answers.forEach((answer) => {
    
    // Basic quality metrics for text answers
    const answerLength = answer.trim().length
    const wordCount = answer.trim().split(/\s+/).length
    const hasSubstance = wordCount >= 3 // At least 3 words
    const isComplete = answerLength >= 10 // At least 10 characters
    
    // Mock comprehension check - look for relevant terms from the source text
    const sourceWords = payload.text.toLowerCase().split(/\s+/)
    const answerWords = answer.toLowerCase().split(/\s+/)
    const relevanceScore = answerWords.filter(word => 
      word.length > 3 && sourceWords.includes(word)
    ).length / Math.max(answerWords.length, 1)
    
    // Calculate individual answer score (0-100)
    let answerScore = 0
    
    if (hasSubstance && isComplete) {
      answerScore = 60 // Base score for meaningful answer
      answerScore += relevanceScore * 30 // Bonus for text relevance
      answerScore += Math.min(wordCount / 20, 1) * 10 // Bonus for thoroughness
    } else if (answerLength > 0) {
      answerScore = 20 // Minimal score for attempt
    }
    
    totalScore += answerScore
  })
  
  // Average the scores and add some variability
  const averageScore = totalScore / questionCount
  const finalScore = Math.min(100, Math.max(0, 
    averageScore + (Math.random() - 0.5) * 10
  ))
  
  // Return in the requested format "78" (just the number as a string)
  return Math.round(finalScore).toString()
}

export async function GET() {
  return NextResponse.json({
    message: 'Assessment Webhook API',
    description: 'POST endpoint for processing assessment questions and answers',
    format: 'Expects: { text: string, questions: string[], answers: string[] }'
  })
}