"use client"

import { Board } from "@/components/board/board"
import { KitGeneratorContext } from "@/components/kit/kit-client"
import { KIT_SECTION_LIMITS } from "@/lib/kit"
import { makePreviewGenerator, previewKits, previewUsage } from "./preview-kit"
import { validateDetailsPatch } from "@/lib/job-details"
import {
  FOLLOW_UP_DAYS,
  addDays,
  localToday,
  toBoardJob,
  validateJobInput,
  type BoardActions,
  type Job,
  type JobDetails,
} from "@/lib/jobs"

// Sample dates are relative to today so reminders always have something to show.
const today = localToday()
const now = new Date().toISOString()

const sample = (
  id: string,
  status: Job["status"],
  position: number,
  title: string,
  company: string,
  extra: Partial<JobDetails> = {}
): JobDetails => ({
  id, status, position, title, company,
  url: null, location: null, salary: null, work_mode: null, applied_on: null,
  priority: 0, follow_up_on: null, interviews: [],
  notes: null, contacts: [], description: null,
  created_at: now, updated_at: now,
  ...extra,
})

const SAMPLE_DESCRIPTION = `About the role
We're looking for a Product Marketing Manager to own launches across our analytics products.

What you'll do
• Plan and run product launches with design, sales and engineering
• Write positioning, messaging and sales enablement material
• Talk to customers every week and turn what you learn into strategy

What we're looking for
• 4+ years in product or brand marketing
• Clear, persuasive writing
• Comfortable working with data`

const SAMPLE_JOBS: JobDetails[] = [
  sample("1", "wishlist", 0, "Product Marketing Manager", "Northwind", {
    location: "London, UK", work_mode: "hybrid", salary: "£55K–£65K / year", url: "https://example.com/jobs/1",
    priority: 3, description: SAMPLE_DESCRIPTION,
    notes: "Referred by Sam from the meetup. Ask about the launch calendar.",
  }),
  sample("2", "wishlist", 1024, "Content Strategist", "Fabrikam", { location: "Remote (EU)", work_mode: "remote", priority: 1 }),
  sample("3", "wishlist", 2048, "Brand Coordinator", "Contoso"),
  sample("4", "applied", 0, "Customer Success Lead", "Tailspin Toys", {
    location: "Berlin, DE", work_mode: "onsite", applied_on: addDays(today, -9), follow_up_on: addDays(today, -2), priority: 2,
    contacts: [{ id: "c1", name: "Priya Shah", role: "Recruiter", email: "priya@tailspin.example", phone: "" }],
  }),
  sample("5", "applied", 1024, "Operations Analyst", "Wide World Importers", {
    salary: "$70K–$85K / year", applied_on: addDays(today, -7), follow_up_on: today,
  }),
  sample("6", "interviewing", 0, "Growth Marketing Specialist", "Adventure Works", {
    location: "Remote (US)", work_mode: "remote", url: "https://example.com/jobs/6", applied_on: addDays(today, -20), priority: 2,
    interviews: [
      { id: "i1", date: addDays(today, -5), time: "10:00", label: "Recruiter call" },
      { id: "i2", date: today, time: "14:30", label: "Hiring manager" },
    ],
    contacts: [
      { id: "c2", name: "Jordan Lee", role: "Head of Growth", email: "jordan@adventure.example", phone: "+1 555 0100" },
    ],
  }),
  sample("7", "interviewing", 1024, "Marketing Analyst", "Litware", {
    applied_on: addDays(today, -14),
    interviews: [{ id: "i3", date: addDays(today, 1), time: "", label: "Phone screen" }],
  }),
]

// In-memory stand-in for the database.
const store = new Map(SAMPLE_JOBS.map((j) => [j.id, { ...j }]))
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
const copy = (job: JobDetails): JobDetails => structuredClone(job)
const boardJob = (job: JobDetails): Job => structuredClone(toBoardJob(job))

function applied(job: JobDetails, today: string) {
  if (!job.applied_on) {
    job.applied_on = today
    if (!job.follow_up_on) job.follow_up_on = addDays(today, FOLLOW_UP_DAYS)
  }
}

const SAMPLE_POSTING = `About the role
We're looking for a Social Media Manager to grow our community across Instagram, TikTok and LinkedIn.

What you'll do
• Plan and publish content every week
• Report on what's working and what isn't`

// Stand-ins for the real Server Actions.
// Try these in the Add job dialog:
//   - any link → reads a sample posting
//   - a link containing "linkedin" → "couldn't read that page" (paste fallback)
//   - a link containing "noai" → AI unavailable (manual fallback)
//   - company "fail" when saving → simulated save error
const previewActions: BoardActions = {
  async createJob(input, today) {
    await wait()
    const checked = validateJobInput(input)
    if ("error" in checked) return { ok: false, error: checked.error }
    if (checked.value.company.toLowerCase() === "fail") return { ok: false, error: "Simulated save error." }
    const inColumn = [...store.values()].filter((j) => j.status === checked.value.status)
    const job = sample(crypto.randomUUID(), checked.value.status, inColumn.length ? Math.min(...inColumn.map((j) => j.position)) - 1024 : 0, checked.value.title, checked.value.company, {
      ...checked.value,
      description: checked.value.description ?? null,
    })
    if (job.status === "applied") applied(job, today)
    store.set(job.id, job)
    return { ok: true, data: boardJob(job) }
  },
  async updateJob(id, input, today) {
    await wait()
    const checked = validateJobInput(input)
    if ("error" in checked) return { ok: false, error: checked.error }
    const job = store.get(id)
    if (!job) return { ok: false, error: "That job no longer exists." }
    if (job.status !== checked.value.status) {
      const inColumn = [...store.values()].filter((j) => j.status === checked.value.status)
      job.position = inColumn.length ? Math.min(...inColumn.map((j) => j.position)) - 1024 : 0
      if (checked.value.status === "applied") applied(job, today)
    }
    const fields = { ...checked.value }
    delete fields.description
    Object.assign(job, fields, { updated_at: new Date().toISOString() })
    return { ok: true, data: boardJob(job) }
  },
  async moveJob(id, status, position, today) {
    await wait()
    const job = store.get(id)
    if (!job) return { ok: false, error: "That job no longer exists." }
    Object.assign(job, { status, position })
    if (status === "applied") applied(job, today)
    return { ok: true, data: boardJob(job) }
  },
  async deleteJob(id) {
    await wait()
    store.delete(id)
    return { ok: true, data: null }
  },
  async getJobDetails(id) {
    await wait(400)
    const job = store.get(id)
    return job ? { ok: true, data: copy(job) } : { ok: false, error: "Couldn't load this job." }
  },
  async updateJobDetails(id, patch) {
    await wait()
    const checked = validateDetailsPatch(patch)
    if ("error" in checked) return { ok: false, error: checked.error }
    const job = store.get(id)
    if (!job) return { ok: false, error: "That job no longer exists." }
    if (typeof checked.value.notes === "string" && checked.value.notes.includes("fail")) {
      return { ok: false, error: "Simulated save error." }
    }
    Object.assign(job, checked.value, { updated_at: new Date().toISOString() })
    return { ok: true, data: copy(job) }
  },
  async getKitInfo(jobId) {
    await wait(300)
    const job = store.get(jobId)
    if (!job) return { ok: false, error: "That job no longer exists." }
    const kit = previewKits.get(jobId)
    return {
      ok: true,
      data: {
        kit: kit ? structuredClone(kit) : null,
        usage: { ...previewUsage },
        hasResume: true,
        hasDescription: Boolean(job.description?.trim()),
        aiReady: true,
      },
    }
  },
  async saveKitSection(jobId, section, text) {
    await wait()
    const kit = previewKits.get(jobId)
    if (!kit) return { ok: false, error: "There's no kit to save." }
    if (text.length > KIT_SECTION_LIMITS[section]) return { ok: false, error: "That's too long to save." }
    kit[section] = text.trim() || null
    kit.updated_at = new Date().toISOString()
    return { ok: true, data: structuredClone(kit) }
  },
  async extractFromUrl(url) {
    await wait(1200)
    if (url.includes("linkedin")) {
      return {
        ok: false,
        reason: "blocked",
        error: "We couldn't read that page. Some sites (like LinkedIn and Indeed) block this. Copy the job description from the page and paste it below instead.",
      }
    }
    if (url.includes("noai")) {
      return {
        ok: false,
        reason: "ai_unavailable",
        error: "The AI isn't set up yet, so please fill in the details yourself. (The app owner needs to add an AI key.)",
        data: { title: "Social Media Manager", company: "", location: "", salary: "", work_mode: "", description: SAMPLE_POSTING },
      }
    }
    return {
      ok: true,
      data: { title: "Social Media Manager", company: "Lumen Labs", location: "Manchester, UK", salary: "£38K–£45K / year", work_mode: "hybrid", description: SAMPLE_POSTING },
    }
  },
  async extractFromText(text) {
    await wait(1200)
    if (text.trim().length < 80) return { ok: false, reason: "invalid", error: "Paste the full job description (at least a few sentences)." }
    return {
      ok: true,
      partial: true,
      data: { title: "Social Media Manager", company: "", location: "", salary: "", work_mode: "", description: text },
    }
  },
}

const previewGenerate = makePreviewGenerator((id) => store.get(id))

export function PreviewBoard() {
  return (
    <KitGeneratorContext value={previewGenerate}>
      <Board initialJobs={[...store.values()].map(boardJob)} actions={previewActions} />
    </KitGeneratorContext>
  )
}
