"use server"

import { DEFAULT_KIT_LIMIT, checkKitLimit, cleanEmail, type Person } from "@/lib/admin"
import type { ActionResult } from "@/lib/jobs"
import { createClient } from "@/lib/supabase/server"

const NOT_ADMIN = "Only admins can do that."

// Every action re-checks that the caller is an admin. The database's own
// rules enforce the same thing.
async function requireAdmin() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return null
  const { data: me } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
  return me?.role === "admin" ? { supabase, userId } : null
}

export async function invite(rawEmail: string): Promise<ActionResult<Person>> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, error: NOT_ADMIN }

  const checked = cleanEmail(rawEmail)
  if ("error" in checked) return { ok: false, error: checked.error }
  const { email } = checked

  const { data: existing } = await admin.supabase.from("profiles").select("id").eq("email", email).maybeSingle()
  if (existing) return { ok: false, error: `${email} already has an account.` }

  const { data, error } = await admin.supabase
    .from("invites")
    .insert({ email, role: "member", invited_by: admin.userId })
    .select("email, created_at")
    .single()

  if (error) {
    if (error.code === "23505") return { ok: false, error: `${email} has already been invited.` }
    console.error("invite:", error.message)
    return { ok: false, error: "Couldn't save the invite. Please try again." }
  }

  return {
    ok: true,
    data: {
      key: `invite:${email}`,
      userId: null,
      email,
      name: null,
      role: "member",
      status: "invited",
      kitLimit: DEFAULT_KIT_LIMIT,
      kitsThisMonth: 0,
      costThisMonth: 0,
      kitsTotal: 0,
      costTotal: 0,
      lastUsedAt: null,
      since: data.created_at,
      isSelf: false,
    },
  }
}

export async function revokeInvite(rawEmail: string): Promise<ActionResult<null>> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, error: NOT_ADMIN }

  const checked = cleanEmail(rawEmail)
  if ("error" in checked) return { ok: false, error: checked.error }

  // Only invites that haven't been used yet can be withdrawn.
  const { data, error } = await admin.supabase
    .from("invites")
    .delete()
    .eq("email", checked.email)
    .is("accepted_at", null)
    .select("email")
  if (error) {
    console.error("revokeInvite:", error.message)
    return { ok: false, error: "Couldn't remove the invite. Please try again." }
  }
  if (!data?.length) return { ok: false, error: "That invite has already been used, so it can't be withdrawn." }
  return { ok: true, data: null }
}

export async function setKitLimit(userId: string, rawLimit: number): Promise<ActionResult<number>> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, error: NOT_ADMIN }

  const checked = checkKitLimit(rawLimit)
  if ("error" in checked) return { ok: false, error: checked.error }

  const { data, error } = await admin.supabase
    .from("profiles")
    .update({ monthly_kit_limit: checked.limit })
    .eq("id", String(userId))
    .select("monthly_kit_limit")
    .maybeSingle()
  if (error || !data) {
    console.error("setKitLimit:", error?.message)
    return { ok: false, error: "Couldn't save the limit. Please try again." }
  }
  return { ok: true, data: data.monthly_kit_limit }
}
