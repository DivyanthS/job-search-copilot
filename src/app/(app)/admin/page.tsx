import type { Metadata } from "next"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { AdminView } from "@/components/admin/admin-view"
import { DEFAULT_KIT_LIMIT, type Person } from "@/lib/admin"
import { requireProfile } from "@/lib/profile"
import { createClient } from "@/lib/supabase/server"
import { invite, revokeInvite, setKitLimit } from "./actions"

export const metadata: Metadata = { title: "Admin" }

type UsageRow = {
  user_id: string
  kits_this_month: number
  cost_this_month: number | string
  kits_total: number
  cost_total: number | string
  last_used_at: string | null
}

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  return `${h.get("x-forwarded-proto") ?? "https"}://${host}`
}

export default async function AdminPage() {
  const me = await requireProfile()
  if (me.role !== "admin") notFound()

  const supabase = await createClient()
  const [{ data: profiles }, { data: invites }, { data: usage, error: usageError }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role, monthly_kit_limit, created_at").order("created_at"),
    supabase.from("invites").select("email, accepted_at, created_at").is("accepted_at", null).order("created_at"),
    supabase.rpc("admin_usage_summary"),
  ])
  if (usageError) console.error("admin usage:", usageError.message)

  const usageByUser = new Map((usage as UsageRow[] | null)?.map((u) => [u.user_id, u]) ?? [])
  const emails = new Set(profiles?.map((p) => p.email) ?? [])

  const people: Person[] = [
    ...(profiles ?? []).map((p): Person => {
      const u = usageByUser.get(p.id)
      return {
        key: p.id,
        userId: p.id,
        email: p.email,
        name: p.full_name,
        role: p.role,
        status: "active",
        kitLimit: p.monthly_kit_limit,
        kitsThisMonth: u?.kits_this_month ?? 0,
        costThisMonth: Number(u?.cost_this_month ?? 0),
        kitsTotal: u?.kits_total ?? 0,
        costTotal: Number(u?.cost_total ?? 0),
        lastUsedAt: u?.last_used_at ?? null,
        since: p.created_at,
        isSelf: p.id === me.id,
      }
    }),
    ...(invites ?? [])
      .filter((i) => !emails.has(i.email))
      .map(
        (i): Person => ({
          key: `invite:${i.email}`,
          userId: null,
          email: i.email,
          name: null,
          role: "member",
          status: "invited",
          kitLimit: DEFAULT_KIT_LIMIT,
          kitsThisMonth: 0,
          costThisMonth: 0,
          kitsTotal: 0,
          costTotal: 0,
          lastUsedAt: null,
          since: i.created_at,
          isSelf: false,
        })
      ),
  ]

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Invite people and keep an eye on AI usage.</p>
      </div>
      {usageError && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          Usage numbers couldn&apos;t be loaded. Make sure every file in <code className="text-xs">supabase/migrations</code> has been run.
        </p>
      )}
      <AdminView initialPeople={people} siteUrl={await siteUrl()} actions={{ invite, revokeInvite, setKitLimit }} />
    </div>
  )
}
