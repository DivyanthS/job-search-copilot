"use client"

import { ProfileCard } from "@/components/settings/profile-card"
import { ResumeCard } from "@/components/settings/resume-card"
import { MIN_RESUME_CHARS, type SettingsActions } from "@/lib/resume"
import { previewReadResume } from "./actions"

const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms))

const previewActions: SettingsActions = {
  uploadResume: previewReadResume,
  async saveResumeText(text) {
    await wait()
    const content = text.trim()
    if (content.length < MIN_RESUME_CHARS) {
      return { ok: false, error: "That's quite short for a resume. Paste the whole thing, including your experience." }
    }
    return { ok: true, data: { content, file_name: null, file_size: null, file_type: null, updated_at: new Date().toISOString() } }
  },
  async deleteResume() {
    await wait()
    return { ok: true, data: null }
  },
  async getResumeDownloadUrl() {
    await wait()
    return { ok: false, error: "Downloads aren't available in the preview." }
  },
  async updateName(name) {
    await wait()
    return { ok: true, data: name.trim() || null }
  },
}

export function PreviewSettings() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Your details and the resume used for your application kits.</p>
      </div>
      <ProfileCard name={null} email="you@example.com" actions={previewActions} />
      <ResumeCard initial={null} actions={previewActions} />
    </div>
  )
}
