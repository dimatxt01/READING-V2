import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

/**
 * Admin Supabase client with service role key
 * This bypasses Row Level Security (RLS) policies
 * USE WITH CAUTION - Only use in admin API routes with proper authorization checks
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase URL or Service Role Key')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
