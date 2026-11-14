import { COLUMNS, type ColumnId } from "@/lib/columns"
import type { Kit, KitInfo, KitSectionId } from "@/lib/kit"

export const WORK_MODES = [
  { id: "remote", label: "Remote" },
  { id: "hybrid", label: "Hybrid" },
  { id: "onsite", label: "On-site" },
] as const

export type WorkMode = (typeof WORK_MODES)[number]["id"]

export function isWorkMode(value: unknown): value is WorkMode {
  return WORK_MODES.some((m) => m.id === value)
}

// A job as the board shows it. The full job description is stored too, but
// isn't loaded onto the board because it can be long.
export type Job = {
  id: string
  status: ColumnId
  position: number
  title: string
  company: string
  url: string | null
  location: string | null
  salary: string | null
  work_mode: WorkMode | null
  applied_on: string | null // YYYY-MM-DD
  priority: number // 0 = not set, 1–3 stars
  follow_up_on: string | null // YYYY-MM-DD
  interviews: Interview[]
  created_at: string
  updated_at: string
}

export type Interview = {
  id: string
  date: string // YYYY-MM-DD
  time: string // HH:MM, or "" when not known
  label: string // e.g. "Phone screen"
}

export type Contact = {
  id: string
  name: string
  role: string
  email: string
  phone: string
}

// Everything about a job, loaded when its panel is opened.
export type JobDetails = Job & {
  notes: string | null
  contacts: Contact[]
  description: string | null
}

export const JOB_COLUMNS =
  "id, status, position, title, company, url, location, salary, work_mode, applied_on, priority, follow_up_on, interviews, created_at, updated_at"

export const JOB_DETAIL_COLUMNS = `${JOB_COLUMNS}, notes, contacts, description`

// What the add/edit form sends.
export type JobInput = {
  title: string
  company: string
  url: string
  location: string
  salary: string
  work_mode: WorkMode | ""
  status: ColumnId
  // The job description read from the posting. Only sent when adding a job.
  description?: string
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

// ---------------------------------------------------------------------------
// Reading a job posting (from a link or pasted text).
// ---------------------------------------------------------------------------
export type ExtractedJob = {
  title: string
  company: string
  location: string
  salary: string
  work_mode: WorkMode | ""
  description: string
}

export type ExtractFailure =
  | "blocked" // the site wouldn't let us read the page
  | "not_job" // the page/text doesn't look like a job posting
  | "ai_unavailable" // OpenRouter isn't set up, or is down
  | "invalid" // bad link or empty text
  | "signed_out"

export type ExtractOutcome =
  | { ok: true; data: ExtractedJob; partial?: boolean }
  | { ok: false; reason: ExtractFailure; error: string; data?: Partial<ExtractedJob> }

// What the board needs from the server. The real board gets Server Actions;
// the development preview gets in-memory stand-ins.
export type BoardActions = {
  createJob: (input: JobInput, today: string) => Promise<ActionResult<Job>>
  updateJob: (id: string, input: JobInput, today: string) => Promise<ActionResult<Job>>
  moveJob: (id: string, status: ColumnId, position: number, today: string) => Promise<ActionResult<Job>>
  deleteJob: (id: string) => Promise<ActionResult<null>>
  extractFromUrl: (url: string) => Promise<ExtractOutcome>
  extractFromText: (text: string) => Promise<ExtractOutcome>
  getJobDetails: (id: string) => Promise<ActionResult<JobDetails>>
  updateJobDetails: (id: string, patch: DetailsPatch) => Promise<ActionResult<JobDetails>>
  getKitInfo: (jobId: string) => Promise<ActionResult<KitInfo>>
  saveKitSection: (jobId: string, section: KitSectionId, text: string) => Promise<ActionResult<Kit>>
}

// The parts of a job its panel can change.
export type DetailsPatch = Partial<{
  priority: number
  applied_on: string | null
  follow_up_on: string | null
  notes: string
  contacts: Contact[]
  interviews: Interview[]
  description: string
}>

export function isColumnId(value: unknown): value is ColumnId {
  return COLUMNS.some((c) => c.id === value)
}

export const MAX_DESCRIPTION = 60000

export type CleanJobInput = {
  title: string
  company: string
  url: string | null
  location: string | null
  salary: string | null
  work_mode: WorkMode | null
  status: ColumnId
  description?: string | null // undefined = leave unchanged
}

// Adds https:// when missing and checks it's a normal web address.
export function normalizeUrl(raw: string): { url: string } | { error: string } {
  let url = raw.trim()
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  try {
    const parsed = new URL(url)
    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname.includes(".")) throw new Error()
    url = parsed.toString()
  } catch {
    return { error: "That link doesn't look right. Paste the full web address of the job posting." }
  }
  if (url.length > 2000) return { error: "That link is too long." }
  return { url }
}

// Checks and tidies form input. Returns an error message for the person, or
// the cleaned values.
export function validateJobInput(input: JobInput): { error: string } | { value: CleanJobInput } {
  const title = String(input.title ?? "").trim()
  const company = String(input.company ?? "").trim()
  const location = String(input.location ?? "").trim()
  const salary = String(input.salary ?? "").trim()
  const rawUrl = String(input.url ?? "").trim()

  if (!title) return { error: "Please add the job title." }
  if (!company) return { error: "Please add the company name." }
  if (title.length > 200) return { error: "The job title is too long (200 characters max)." }
  if (company.length > 200) return { error: "The company name is too long (200 characters max)." }
  if (location.length > 200) return { error: "The location is too long (200 characters max)." }
  if (salary.length > 200) return { error: "The salary is too long (200 characters max)." }
  if (!isColumnId(input.status)) return { error: "Please pick a column." }
  if (input.work_mode && !isWorkMode(input.work_mode)) return { error: "Please pick remote, hybrid or on-site." }

  let url: string | null = null
  if (rawUrl) {
    const checked = normalizeUrl(rawUrl)
    if ("error" in checked) return checked
    url = checked.url
  }

  let description: string | null | undefined
  if (input.description !== undefined) {
    description = String(input.description).trim().slice(0, MAX_DESCRIPTION) || null
  }

  return {
    value: {
      title,
      company,
      url,
      location: location || null,
      salary: salary || null,
      work_mode: input.work_mode || null,
      status: input.status,
      ...(description !== undefined ? { description } : {}),
    },
  }
}

// ---------------------------------------------------------------------------
// Ordering within a column. Cards hold a number; the board sorts by it.
// ---------------------------------------------------------------------------
const GAP = 1024

export function positionBetween(before?: number, after?: number) {
  if (before === undefined && after === undefined) return 0
  if (before === undefined) return after! - GAP
  if (after === undefined) return before + GAP
  return (before + after) / 2
}

export function topPosition(jobsInColumn: Pick<Job, "position">[]) {
  if (jobsInColumn.length === 0) return 0
  return Math.min(...jobsInColumn.map((j) => j.position)) - GAP
}

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

export function localToday() {
  return new Date().toLocaleDateString("en-CA") // YYYY-MM-DD in the person's own timezone
}

// Adds days to a YYYY-MM-DD date.
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString("en-CA")
}

// Days from `from` to `to` (both YYYY-MM-DD). Negative when `to` is earlier.
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00`) - Date.parse(`${from}T12:00:00`)) / 86_400_000)
}

// The next interview on or after `today`, if any.
export function nextInterview(interviews: Interview[], today: string) {
  return [...interviews]
    .filter((i) => i.date >= today)
    .sort((a, b) => (a.date + (a.time || "99")).localeCompare(b.date + (b.time || "99")))[0]
}

// Days after applying before the app suggests following up.
export const FOLLOW_UP_DAYS = 7

// Keeps only the fields the board shows (the job panel loads the rest).
export function toBoardJob(job: Job): Job {
  return {
    id: job.id,
    status: job.status,
    position: job.position,
    title: job.title,
    company: job.company,
    url: job.url,
    location: job.location,
    salary: job.salary,
    work_mode: job.work_mode,
    applied_on: job.applied_on,
    priority: job.priority,
    follow_up_on: job.follow_up_on,
    interviews: job.interviews,
    created_at: job.created_at,
    updated_at: job.updated_at,
  }
}
