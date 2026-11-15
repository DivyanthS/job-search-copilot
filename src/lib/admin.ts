import type { ActionResult } from "@/lib/jobs"

export const MAX_KIT_LIMIT = 500
export const DEFAULT_KIT_LIMIT = 30 // matches the database default

// One row on the admin page: someone with an account, or an invite that
// hasn't been used yet.
export type Person = {
  key: string
  userId: string | null
  email: string
  name: string | null
  role: "admin" | "member"
  status: "active" | "invited"
  kitLimit: number
  kitsThisMonth: number
  costThisMonth: number
  kitsTotal: number
  costTotal: number
  lastUsedAt: string | null
  since: string // joined, or invited
  isSelf: boolean
}

export type AdminActions = {
  invite: (email: string) => Promise<ActionResult<Person>>
  revokeInvite: (email: string) => Promise<ActionResult<null>>
  setKitLimit: (userId: string, limit: number) => Promise<ActionResult<number>>
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function cleanEmail(raw: string): { email: string } | { error: string } {
  const email = String(raw ?? "").trim().toLowerCase()
  if (!EMAIL.test(email) || email.length > 254) return { error: "That email address doesn't look right." }
  return { email }
}

export function checkKitLimit(raw: number): { limit: number } | { error: string } {
  const limit = Number(raw)
  if (!Number.isInteger(limit) || limit < 0 || limit > MAX_KIT_LIMIT) {
    return { error: `Pick a whole number from 0 to ${MAX_KIT_LIMIT}.` }
  }
  return { limit }
}

export function formatCost(usd: number) {
  if (usd === 0) return "$0"
  if (usd < 0.01) return "<$0.01"
  return `$${usd.toFixed(2)}`
}

// The message an admin sends to someone they've invited.
export function inviteMessage(email: string, siteUrl: string) {
  return `Hi! I've invited you to Job Copilot, an app for tracking job applications that writes a tailored cover letter, resume bullets, interview prep and a company brief for each job.

To get started, go to ${siteUrl}/login and sign in with this email address: ${email}`
}
