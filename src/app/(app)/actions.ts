"use server"

import { createClient } from "@/lib/supabase/server"
import type { ColumnId } from "@/lib/columns"
import * as extract from "@/lib/extract/extract-job"
import {
  JOB_COLUMNS,
  MAX_DESCRIPTION,
  isColumnId,
  isIsoDate,
  normalizeUrl,
  topPosition,
  validateJobInput,
  type ActionResult,
  type ExtractOutcome,
  type Job,
  type JobInput,
} from "@/lib/jobs"

const SIGNED_OUT = "You've been signed out. Please refresh the page and sign in again."
const SAVE_FAILED = "Couldn't save your change. Check your connection and try again."

// Each action re-checks who is signed in. The database's row-level security
// also guarantees people can only ever touch their own jobs.
async function signedInClient() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return data?.claims?.sub ? supabase : null
}

export async function createJob(input: JobInput, today: string): Promise<ActionResult<Job>> {
  const checked = validateJobInput(input)
  if ("error" in checked) return { ok: false, error: checked.error }

  const supabase = await signedInClient()
  if (!supabase) return { ok: false, error: SIGNED_OUT }

  const { data: column } = await supabase
    .from("jobs")
    .select("position")
    .eq("status", checked.value.status)
    .order("position", { ascending: true })
    .limit(1)

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      ...checked.value,
      position: topPosition(column ?? []),
      applied_on: checked.value.status === "applied" ? safeToday(today) : null,
    })
    .select(JOB_COLUMNS)
    .single<Job>()

  if (error || !data) {
    console.error("createJob:", error?.message)
    return { ok: false, error: SAVE_FAILED }
  }
  return { ok: true, data }
}

export async function updateJob(id: string, input: JobInput, today: string): Promise<ActionResult<Job>> {
  const checked = validateJobInput(input)
  if ("error" in checked) return { ok: false, error: checked.error }

  const supabase = await signedInClient()
  if (!supabase) return { ok: false, error: SIGNED_OUT }

  const { data: existing } = await supabase.from("jobs").select("status, applied_on").eq("id", id).single()
  if (!existing) return { ok: false, error: "That job no longer exists." }

  const changes: Record<string, unknown> = { ...checked.value }
  if (existing.status !== checked.value.status) {
    // Changing column from the edit form moves the card to the top.
    const { data: column } = await supabase
      .from("jobs")
      .select("position")
      .eq("status", checked.value.status)
      .order("position", { ascending: true })
      .limit(1)
    changes.position = topPosition(column ?? [])
    if (checked.value.status === "applied" && !existing.applied_on) {
      changes.applied_on = safeToday(today)
    }
  }

  const { data, error } = await supabase
    .from("jobs")
    .update(changes)
    .eq("id", id)
    .select(JOB_COLUMNS)
    .single<Job>()

  if (error || !data) {
    console.error("updateJob:", error?.message)
    return { ok: false, error: SAVE_FAILED }
  }
  return { ok: true, data }
}

export async function moveJob(
  id: string,
  status: ColumnId,
  position: number,
  today: string
): Promise<ActionResult<Job>> {
  if (!isColumnId(status) || !Number.isFinite(position)) return { ok: false, error: SAVE_FAILED }

  const supabase = await signedInClient()
  if (!supabase) return { ok: false, error: SIGNED_OUT }

  const changes: Record<string, unknown> = { status, position }

  // First time a card lands in "Applied": record today's date (the person's
  // own date, sent from their browser). They can change it later.
  if (status === "applied") {
    const { data: existing } = await supabase.from("jobs").select("applied_on").eq("id", id).single()
    if (existing && !existing.applied_on) {
      changes.applied_on = safeToday(today)
    }
  }

  const { data, error } = await supabase
    .from("jobs")
    .update(changes)
    .eq("id", id)
    .select(JOB_COLUMNS)
    .single<Job>()

  if (error || !data) {
    console.error("moveJob:", error?.message)
    return { ok: false, error: SAVE_FAILED }
  }
  return { ok: true, data }
}

export async function deleteJob(id: string): Promise<ActionResult<null>> {
  const supabase = await signedInClient()
  if (!supabase) return { ok: false, error: SIGNED_OUT }

  const { error } = await supabase.from("jobs").delete().eq("id", id)
  if (error) {
    console.error("deleteJob:", error.message)
    return { ok: false, error: "Couldn't delete the job. Please try again." }
  }
  return { ok: true, data: null }
}

// Today's date as the person's browser sees it, falling back to the server's.
function safeToday(today: string) {
  return isIsoDate(today) ? today : new Date().toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Reading job postings
// ---------------------------------------------------------------------------
const EXTRACT_SIGNED_OUT: ExtractOutcome = { ok: false, reason: "signed_out", error: SIGNED_OUT }

export async function extractFromUrl(url: string): Promise<ExtractOutcome> {
  if (!(await signedInClient())) return EXTRACT_SIGNED_OUT
  const checked = normalizeUrl(String(url ?? ""))
  if ("error" in checked) return { ok: false, reason: "invalid", error: checked.error }
  return extract.extractFromUrl(checked.url)
}

export async function extractFromText(text: string): Promise<ExtractOutcome> {
  if (!(await signedInClient())) return EXTRACT_SIGNED_OUT
  return extract.extractFromText(String(text ?? "").slice(0, MAX_DESCRIPTION))
}
