"use server"

import { createClient } from "@/lib/supabase/server"
import type { ColumnId } from "@/lib/columns"
import * as extract from "@/lib/extract/extract-job"
import { isAIConfigured } from "@/lib/ai"
import { validateDetailsPatch } from "@/lib/job-details"
import { KIT_COLUMNS, KIT_SECTION_LIMITS, isKitSectionId, type Kit, type KitInfo, type KitSectionId } from "@/lib/kit"
import {
  FOLLOW_UP_DAYS,
  JOB_COLUMNS,
  JOB_DETAIL_COLUMNS,
  MAX_DESCRIPTION,
  addDays,
  isColumnId,
  isIsoDate,
  normalizeUrl,
  topPosition,
  validateJobInput,
  type ActionResult,
  type DetailsPatch,
  type ExtractOutcome,
  type Job,
  type JobDetails,
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

// Today's date as the person's browser sees it, falling back to the server's.
function safeToday(today: string) {
  return isIsoDate(today) ? today : new Date().toISOString().slice(0, 10)
}

// The first time a job lands in "Applied": record the date, and suggest a
// follow-up a week later (unless a reminder is already set).
function appliedChanges(existing: { applied_on: string | null; follow_up_on: string | null } | null, today: string) {
  const changes: Record<string, string> = {}
  const date = safeToday(today)
  if (!existing?.applied_on) changes.applied_on = date
  if (!existing?.applied_on && !existing?.follow_up_on) changes.follow_up_on = addDays(date, FOLLOW_UP_DAYS)
  return changes
}

async function topOfColumn(supabase: NonNullable<Awaited<ReturnType<typeof signedInClient>>>, status: ColumnId) {
  const { data } = await supabase
    .from("jobs")
    .select("position")
    .eq("status", status)
    .order("position", { ascending: true })
    .limit(1)
  return topPosition(data ?? [])
}

export async function createJob(input: JobInput, today: string): Promise<ActionResult<Job>> {
  const checked = validateJobInput(input)
  if ("error" in checked) return { ok: false, error: checked.error }

  const supabase = await signedInClient()
  if (!supabase) return { ok: false, error: SIGNED_OUT }

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      ...checked.value,
      position: await topOfColumn(supabase, checked.value.status),
      ...(checked.value.status === "applied" ? appliedChanges(null, today) : {}),
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

  const { data: existing } = await supabase
    .from("jobs")
    .select("status, applied_on, follow_up_on")
    .eq("id", id)
    .single()
  if (!existing) return { ok: false, error: "That job no longer exists." }

  const changes: Record<string, unknown> = { ...checked.value }
  if (existing.status !== checked.value.status) {
    // Changing column from the edit form moves the card to the top.
    changes.position = await topOfColumn(supabase, checked.value.status)
    if (checked.value.status === "applied") Object.assign(changes, appliedChanges(existing, today))
  }

  const { data, error } = await supabase.from("jobs").update(changes).eq("id", id).select(JOB_COLUMNS).single<Job>()

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
  if (status === "applied") {
    const { data: existing } = await supabase.from("jobs").select("applied_on, follow_up_on").eq("id", id).single()
    if (existing) Object.assign(changes, appliedChanges(existing, today))
  }

  const { data, error } = await supabase.from("jobs").update(changes).eq("id", id).select(JOB_COLUMNS).single<Job>()

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

// ---------------------------------------------------------------------------
// The job panel
// ---------------------------------------------------------------------------
export async function getJobDetails(id: string): Promise<ActionResult<JobDetails>> {
  const supabase = await signedInClient()
  if (!supabase) return { ok: false, error: SIGNED_OUT }

  const { data, error } = await supabase.from("jobs").select(JOB_DETAIL_COLUMNS).eq("id", id).single<JobDetails>()
  if (error || !data) {
    console.error("getJobDetails:", error?.message)
    return { ok: false, error: "Couldn't load this job. Please try again." }
  }
  return { ok: true, data }
}

export async function updateJobDetails(id: string, patch: DetailsPatch): Promise<ActionResult<JobDetails>> {
  const checked = validateDetailsPatch(patch)
  if ("error" in checked) return { ok: false, error: checked.error }

  const supabase = await signedInClient()
  if (!supabase) return { ok: false, error: SIGNED_OUT }

  const { data, error } = await supabase
    .from("jobs")
    .update(checked.value)
    .eq("id", id)
    .select(JOB_DETAIL_COLUMNS)
    .single<JobDetails>()

  if (error || !data) {
    console.error("updateJobDetails:", error?.message)
    return { ok: false, error: SAVE_FAILED }
  }
  return { ok: true, data }
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

// ---------------------------------------------------------------------------
// Application kits
// ---------------------------------------------------------------------------
export async function getKitInfo(jobId: string): Promise<ActionResult<KitInfo>> {
  const supabase = await signedInClient()
  if (!supabase) return { ok: false, error: SIGNED_OUT }
  const { data: auth } = await supabase.auth.getClaims()
  const userId = auth!.claims.sub

  const [{ data: kit, error }, { data: job }, { data: resume }, { data: profile }, { data: used }] = await Promise.all([
    supabase.from("kits").select(KIT_COLUMNS).eq("job_id", jobId).maybeSingle<Kit>(),
    supabase.from("jobs").select("description").eq("id", jobId).maybeSingle(),
    supabase.from("resumes").select("user_id").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("monthly_kit_limit").eq("id", userId).maybeSingle(),
    supabase.rpc("kits_used_this_month"),
  ])
  if (error) {
    console.error("getKitInfo:", error.message)
    return { ok: false, error: "Couldn't load the kit. Please try again." }
  }
  return {
    ok: true,
    data: {
      kit: kit ?? null,
      usage: { used: typeof used === "number" ? used : 0, limit: profile?.monthly_kit_limit ?? 0 },
      hasResume: Boolean(resume),
      hasDescription: Boolean(job?.description?.trim()),
      aiReady: isAIConfigured(),
    },
  }
}

export async function saveKitSection(jobId: string, section: KitSectionId, text: string): Promise<ActionResult<Kit>> {
  if (!isKitSectionId(section)) return { ok: false, error: SAVE_FAILED }
  const content = String(text ?? "").trim()
  if (content.length > KIT_SECTION_LIMITS[section]) return { ok: false, error: "That's too long to save." }

  const supabase = await signedInClient()
  if (!supabase) return { ok: false, error: SIGNED_OUT }

  const { data, error } = await supabase
    .from("kits")
    .update({ [section]: content || null })
    .eq("job_id", jobId)
    .select(KIT_COLUMNS)
    .single<Kit>()
  if (error || !data) {
    console.error("saveKitSection:", error?.message)
    return { ok: false, error: SAVE_FAILED }
  }
  return { ok: true, data }
}
