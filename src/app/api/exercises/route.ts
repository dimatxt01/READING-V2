import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's subscription tier to filter exercises
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    const subscriptionTier = profile?.subscription_tier || 'free'

    // Define tier hierarchy
    const tierOrder = { free: 0, reader: 1, pro: 2 }
    const userTierLevel = tierOrder[subscriptionTier as keyof typeof tierOrder]

    // Get exercises available to user's tier
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: exercises, error } = await (supabase as any)
      .from('exercises')
      .select('*')
      .eq('is_active', true)
      .order('type')
      .order('difficulty')

    if (error) {
      console.error('Error fetching exercises:', error)
      return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 })
    }

    // Filter exercises based on subscription tier
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const availableExercises = exercises?.filter((exercise: any) => {
      const requiredTierLevel = tierOrder[exercise.min_subscription_tier as keyof typeof tierOrder] || 0
      return userTierLevel >= requiredTierLevel
    }) || []

    return NextResponse.json({ exercises: availableExercises })
  } catch (error) {
    console.error('Error in GET /api/exercises:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { title, type, difficulty, description, instructions, config, min_subscription_tier } = body

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: exercise, error } = await (supabase as any)
      .from('exercises')
      .insert({
        title,
        type,
        difficulty: difficulty || 'beginner',
        description,
        instructions,
        config: config || {},
        min_subscription_tier: min_subscription_tier || 'free',
        requires_subscription: min_subscription_tier !== 'free',
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating exercise:', error)
      return NextResponse.json({ error: 'Failed to create exercise' }, { status: 500 })
    }

    return NextResponse.json({ exercise })
  } catch (error) {
    console.error('Error in POST /api/exercises:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}