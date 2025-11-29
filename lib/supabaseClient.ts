import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client for server-side use only.
 *
 * IMPORTANT: This uses the service role key which has full database access.
 * The service role key must NEVER be exposed to the browser.
 * Only use this in server-side code (API routes, scripts, etc.).
 */
export function createServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
}
