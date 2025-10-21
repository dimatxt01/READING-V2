import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      return NextResponse.json({ 
        authenticated: false, 
        error: error.message 
      }, { status: 401 })
    }
    
    if (!user) {
      return NextResponse.json({ 
        authenticated: false 
      }, { status: 401 })
    }
    
    return NextResponse.json({ 
      authenticated: true, 
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      authenticated: false, 
      error: 'Session validation failed' 
    }, { status: 500 })
  }
}
