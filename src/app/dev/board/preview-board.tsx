"use client"

import { Board } from "@/components/board/board"
import { validateJobInput, type BoardActions, type Job } from "@/lib/jobs"

const now = new Date().toISOString()
const sample = (id: string, status: Job["status"], position: number, title: string, company: string, extra: Partial<Job> = {}): Job => ({
  id, status, position, title, company, url: null, location: null, salary: null, work_mode: null, applied_on: null, created_at: now, updated_at: now, ...extra,
})

const SAMPLE_JOBS: Job[] = [
  sample("1", "wishlist", 0, "Product Marketing Manager", "Northwind", { location: "London, UK", work_mode: "hybrid", salary: "£55K–£65K / year", url: "https://example.com/jobs/1" }),
  sample("2", "wishlist", 1024, "Content Strategist", "Fabrikam", { location: "Remote (EU)", work_mode: "remote" }),
  sample("3", "wishlist", 2048, "Brand Coordinator", "Contoso"),
  sample("4", "applied", 0, "Customer Success Lead", "Tailspin Toys", { location: "Berlin, DE", work_mode: "onsite", applied_on: "2026-11-02" }),
  sample("5", "applied", 1024, "Operations Analyst", "Wide World Importers", { salary: "$70K–$85K / year", applied_on: "2026-11-09" }),
  sample("6", "interviewing", 0, "Growth Marketing Specialist", "Adventure Works", { location: "Remote (US)", work_mode: "remote", url: "https://example.com/jobs/6", applied_on: "2026-10-20" }),
]

// In-memory stand-in for the database.
const store = new Map(SAMPLE_JOBS.map((j) => [j.id, { ...j }]))
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
const copy = (job: Job) => ({ ...job })

const SAMPLE_DESCRIPTION = `About the role
We're looking for a Social Media Manager to grow our community across Instagram, TikTok and LinkedIn.

What you'll do
• Plan and publish content every week
• Report on what's working and what isn't

What we're looking for
• 3+ years managing brand social accounts
• Great writing and an eye for design`

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
    const stamp = new Date().toISOString()
    const fields = { ...checked.value }
    delete fields.description // the preview board doesn't keep descriptions
    const job: Job = {
      id: crypto.randomUUID(),
      position: inColumn.length ? Math.min(...inColumn.map((j) => j.position)) - 1024 : 0,
      applied_on: checked.value.status === "applied" ? today : null,
      created_at: stamp,
      updated_at: stamp,
      ...fields,
    }
    store.set(job.id, job)
    return { ok: true, data: copy(job) }
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
      if (checked.value.status === "applied" && !job.applied_on) job.applied_on = today
    }
    const fields = { ...checked.value }
    delete fields.description // the preview board doesn't keep descriptions
    Object.assign(job, fields, { updated_at: new Date().toISOString() })
    return { ok: true, data: copy(job) }
  },
  async moveJob(id, status, position, today) {
    await wait()
    const job = store.get(id)
    if (!job) return { ok: false, error: "That job no longer exists." }
    Object.assign(job, { status, position })
    if (status === "applied" && !job.applied_on) job.applied_on = today
    return { ok: true, data: copy(job) }
  },
  async deleteJob(id) {
    await wait()
    store.delete(id)
    return { ok: true, data: null }
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
        error: "The AI isn't set up yet, so please fill in the details yourself. (The app owner needs to add an OpenRouter key.)",
        data: { title: "Social Media Manager", company: "", location: "", salary: "", work_mode: "", description: SAMPLE_DESCRIPTION },
      }
    }
    return {
      ok: true,
      data: { title: "Social Media Manager", company: "Lumen Labs", location: "Manchester, UK", salary: "£38K–£45K / year", work_mode: "hybrid", description: SAMPLE_DESCRIPTION },
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

export function PreviewBoard() {
  return <Board initialJobs={[...store.values()].map(copy)} actions={previewActions} />
}
