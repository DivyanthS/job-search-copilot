"use client"

import { AdminView } from "@/components/admin/admin-view"
import { DEFAULT_KIT_LIMIT, checkKitLimit, cleanEmail, type AdminActions, type Person } from "@/lib/admin"

const now = Date.now()
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString()

const person = (p: Partial<Person> & Pick<Person, "key" | "email">): Person => ({
  userId: p.key,
  name: null,
  role: "member",
  status: "active",
  kitLimit: DEFAULT_KIT_LIMIT,
  kitsThisMonth: 0,
  costThisMonth: 0,
  kitsTotal: 0,
  costTotal: 0,
  lastUsedAt: null,
  since: daysAgo(30),
  isSelf: false,
  ...p,
})

const SAMPLE: Person[] = [
  person({ key: "u1", email: "you@example.com", name: "You (admin)", role: "admin", isSelf: true, kitsThisMonth: 7, costThisMonth: 0.71, kitsTotal: 19, costTotal: 1.93, since: daysAgo(40) }),
  person({ key: "u2", email: "sam@example.com", name: "Sam Patel", kitsThisMonth: 26, costThisMonth: 2.48, kitsTotal: 31, costTotal: 2.97, since: daysAgo(21) }),
  person({ key: "u3", email: "jo@example.com", name: "Jo Rivera", kitsThisMonth: 30, costThisMonth: 3.12, kitsTotal: 30, costTotal: 3.12, since: daysAgo(12) }),
  person({ key: "u4", email: "lee@example.com", kitLimit: 0, since: daysAgo(3) }),
  person({ key: "invite:alex@example.com", userId: null, email: "alex@example.com", status: "invited", since: daysAgo(2) }),
]

const taken = new Set(SAMPLE.map((p) => p.email))
const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms))

const previewActions: AdminActions = {
  async invite(raw) {
    await wait()
    const checked = cleanEmail(raw)
    if ("error" in checked) return { ok: false, error: checked.error }
    if (taken.has(checked.email)) return { ok: false, error: `${checked.email} has already been invited.` }
    taken.add(checked.email)
    return {
      ok: true,
      data: person({ key: `invite:${checked.email}`, userId: null, email: checked.email, status: "invited", since: new Date().toISOString() }),
    }
  },
  async revokeInvite(email) {
    await wait()
    taken.delete(email)
    return { ok: true, data: null }
  },
  async setKitLimit(_userId, limit) {
    await wait()
    const checked = checkKitLimit(limit)
    return "error" in checked ? { ok: false, error: checked.error } : { ok: true, data: checked.limit }
  },
}

export function PreviewAdmin() {
  return <AdminView initialPeople={SAMPLE} siteUrl="http://localhost:3000" actions={previewActions} />
}
