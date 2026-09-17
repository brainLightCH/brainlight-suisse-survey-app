import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
  );
}

// Server-only client using the service role key: bypasses RLS by design.
// Never import this file from client components — it must only run in
// Route Handlers / Server Components.
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});
