import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pgphohpuwylnnrbwwclu.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Create Supabase client — if anon key is empty, the client will only work for
// non-authenticated operations. The primary auth flow uses Direct Google OAuth
// via /api/auth/google/callback which doesn't need Supabase Auth SDK.
export const supabase = createClient(supabaseUrl, supabaseAnonKey || "placeholder", {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export default supabase;
