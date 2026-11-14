"use client"

import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseEnv } from "./env"

// Supabase client for code that runs in the browser.
export function createClient() {
  const env = getSupabaseEnv()
  if (!env) throw new Error("Supabase is not configured. See SETUP.md.")
  return createBrowserClient(env.url, env.key)
}
