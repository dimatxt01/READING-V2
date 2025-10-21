import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  // Use the request URL to determine the correct base URL
  const url = new URL(request.url)
  const baseUrl = `${url.protocol}//${url.host}`
  
  return NextResponse.redirect(new URL('/auth/login', baseUrl))
}