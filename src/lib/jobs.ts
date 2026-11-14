import { COLUMNS, type ColumnId } from "@/lib/columns"

export type Job = {
  id: string
  status: ColumnId
  position: number
  title: string
  company: string
  url: string | null
  location: string | null
  applied_on: string | null // YYYY-MM-DD
  created_at: string
  updated_at: string
}

export const JOB_COLUMNS = "id, status, position, title, company, url, location, applied_on, created_at, updated_at"

// What the add/edit form sends.
export type JobInput = {
  title: string
  company: string
  url: string
  location: string
  status: ColumnId
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

// What the board needs from the server. The real board gets Server Actions;
// the development preview gets in-memory stand-ins.
export type BoardActions = {
  createJob: (input: JobInput, today: string) => Promise<ActionResult<Job>>
  updateJob: (id: string, input: JobInput, today: string) => Promise<ActionResult<Job>>
  moveJob: (id: string, status: ColumnId, position: number, today: string) => Promise<ActionResult<Job>>
  deleteJob: (id: string) => Promise<ActionResult<null>>
}

export function isColumnId(value: unknown): value is ColumnId {
  return COLUMNS.some((c) => c.id === value)
}

export type CleanJobInput = {
  title: string
  company: string
  url: string | null
  location: string | null
  status: ColumnId
}

// Checks and tidies form input. Returns an error message for the person, or
// the cleaned values.
export function validateJobInput(input: JobInput): { error: string } | { value: CleanJobInput } {
  const title = String(input.title ?? "").trim()
  const company = String(input.company ?? "").trim()
  const location = String(input.location ?? "").trim()
  let url = String(input.url ?? "").trim()

  if (!title) return { error: "Please add the job title." }
  if (!company) return { error: "Please add the company name." }
  if (title.length > 200) return { error: "The job title is too long (200 characters max)." }
  if (company.length > 200) return { error: "The company name is too long (200 characters max)." }
  if (location.length > 200) return { error: "The location is too long (200 characters max)." }
  if (!isColumnId(input.status)) return { error: "Please pick a column." }

  if (url) {
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`
    try {
      const parsed = new URL(url)
      if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname.includes(".")) throw new Error()
      url = parsed.toString()
    } catch {
      return { error: "That link doesn't look right. Paste the full web address of the job posting." }
    }
    if (url.length > 2000) return { error: "That link is too long." }
  }

  return {
    value: { title, company, url: url || null, location: location || null, status: input.status },
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
