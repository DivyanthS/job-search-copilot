import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: "admin" | "member"
  monthly_kit_limit: number
}

// The signed-in person's profile. Sends them to /login if they aren't signed in.
// Cached so layouts and pages in the same request share one lookup.
export const requireProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, monthly_kit_limit")
    .eq("id", userId)
    .single<Profile>()

  if (profile) return profile

  // Signed in but no profile row: the database setup wasn't run before this
  // account was created. Fall back to the basics so the app still works.
  return {
    id: userId,
    email: String(data.claims.email ?? ""),
    full_name: null,
    role: "member",
    monthly_kit_limit: 0,
  }
})

export function displayName(p: Pick<Profile, "full_name" | "email">) {
  return p.full_name?.trim() || p.email.split("@")[0]
}

export function initials(p: Pick<Profile, "full_name" | "email">) {
  const name = displayName(p)
  const parts = name.split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?"
}
