import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
import type { ExtendedDatabase } from './types'
import type { SupabaseClient } from '@supabase/supabase-js'

// Type-safe wrapper for extended database tables
type ExtendedClient = SupabaseClient<ExtendedDatabase>

// Create an admin client with extended types for server-side use
export async function createAdminServerClient(): Promise<ExtendedClient> {
  const supabase = await createSupabaseServerClient()
  
  // Cast to extended type since we know these tables exist
  return supabase as unknown as ExtendedClient
}

// Export type for use in other files
export type AdminSupabaseServerClient = ExtendedClient