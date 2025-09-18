import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import type { ExtendedDatabase } from './types'
import type { SupabaseClient } from '@supabase/supabase-js'

// Type-safe wrapper for extended database tables
type ExtendedClient = SupabaseClient<ExtendedDatabase>

// Create an admin client with extended types for client-side use
export function createAdminClient(): ExtendedClient {
  const supabase = createSupabaseClient()
  
  // Cast to extended type since we know these tables exist
  return supabase as unknown as ExtendedClient
}

// Export type for use in other files
export type AdminSupabaseClient = ExtendedClient