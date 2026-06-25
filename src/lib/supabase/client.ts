import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Reads the public env vars, which are
// safe to expose (the anon key is gated by Row Level Security).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
