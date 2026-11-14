// Reads the Supabase connection settings from environment variables.
// Returns null when they haven't been filled in yet, so the app can show a
// friendly "setup needed" message instead of crashing.
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null
  return { url, key }
}

export const isGoogleAuthEnabled =
  process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true"
