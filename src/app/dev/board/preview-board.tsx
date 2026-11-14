"use client"

import { Board } from "@/components/board/board"
import { validateJobInput, type BoardActions, type Job } from "@/lib/jobs"

const now = new Date().toISOString()
const sample = (id: string, status: Job["status"], position: number, title: string, company: string, extra: Partial<Job> = {}): Job => ({
  id, status, position, title, company, url: null, location: null, applied_on: null, created_at: now, updated_at: now, ...extra,
})

const SAMPLE_JOBS: Job[] = [
  sample("1", "wishlist", 0, "Product Marketing Manager", "Northwind", { location: "Remote", url: "https://example.com/jobs/1" }),
  sample("2", "wishlist", 1024, "Content Strategist", "Fabrikam", { location: "London" }),
  sample("3", "wishlist", 2048, "Brand Coordinator", "Contoso"),
  sample("4", "applied", 0, "Customer Success Lead", "Tailspin Toys", { location: "Hybrid · Berlin", applied_on: "2026-11-02" }),
  sample("5", "applied", 1024, "Operations Analyst", "Wide World Importers", { applied_on: "2026-11-09" }),
  sample("6", "interviewing", 0, "Growth Marketing Specialist", "Adventure Works", { location: "Remote", url: "https://example.com/jobs/6", applied_on: "2026-10-20" }),
]

// In-memory stand-in for the database.
const store = new Map(SAMPLE_JOBS.map((j) => [j.id, { ...j }]))
const wait = () => new Promise((r) => setTimeout(r, 250))
const copy = (job: Job) => ({ ...job })

// Stand-ins for the real Server Actions. Typing "fail" as a company name
// simulates a save error.
const previewActions: BoardActions = {
  async createJob(input, today) {
    await wait()
    const checked = validateJobInput(input)
    if ("error" in checked) return { ok: false, error: checked.error }
    if (checked.value.company.toLowerCase() === "fail") return { ok: false, error: "Simulated save error." }
    const inColumn = [...store.values()].filter((j) => j.status === checked.value.status)
    const stamp = new Date().toISOString()
    const job: Job = {
      id: crypto.randomUUID(),
      position: inColumn.length ? Math.min(...inColumn.map((j) => j.position)) - 1024 : 0,
      applied_on: checked.value.status === "applied" ? today : null,
      created_at: stamp,
      updated_at: stamp,
      ...checked.value,
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
    Object.assign(job, checked.value, { updated_at: new Date().toISOString() })
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
}

export function PreviewBoard() {
  return <Board initialJobs={[...store.values()].map(copy)} actions={previewActions} />
}
