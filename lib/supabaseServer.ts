import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pgphohpuwylnnrbwwclu.supabase.co";
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

/**
 * Server-side Supabase client using the Service Role Key from environment variables.
 * Bypasses RLS for secure, direct backend operations (API routes).
 * Uses pure HTTPS REST API — no TCP port 5432/6543 connection issues!
 */
export const supabaseServer: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const supabaseAdmin = supabaseServer;

/**
 * Helper to prepare insert payload with guaranteed UUID and timestamps
 */
export function withTimestamps<T extends Record<string, any>>(data: T): T & { id: string; createdAt: string; updatedAt: string } {
  const now = new Date().toISOString();
  return {
    id: data.id || crypto.randomUUID(),
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    ...data,
  };
}

/**
 * Helper to prepare update payload with updatedAt timestamp
 */
export function withUpdatedTimestamp<T extends Record<string, any>>(data: T): T & { updatedAt: string } {
  return {
    ...data,
    updatedAt: new Date().toISOString(),
  };
}

export default supabaseServer;
