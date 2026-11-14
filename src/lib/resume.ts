import type { ActionResult } from "@/lib/jobs"

export const MAX_RESUME_BYTES = 4 * 1024 * 1024 // 4 MB (see next.config.ts)
export const MAX_RESUME_CHARS = 50000
export const MIN_RESUME_CHARS = 200

export const RESUME_FILE_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const

export type ResumeFileKind = keyof typeof RESUME_FILE_TYPES

export const RESUME_ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"

export type Resume = {
  content: string
  file_name: string | null
  file_size: number | null
  file_type: string | null
  updated_at: string
}

export const RESUME_COLUMNS = "content, file_name, file_size, file_type, updated_at"

export type SettingsActions = {
  uploadResume: (form: FormData) => Promise<ActionResult<Resume>>
  saveResumeText: (text: string) => Promise<ActionResult<Resume>>
  deleteResume: () => Promise<ActionResult<null>>
  getResumeDownloadUrl: () => Promise<ActionResult<string>>
  updateName: (name: string) => Promise<ActionResult<string | null>>
}

export function fileKindFromName(name: string): ResumeFileKind | null {
  const ext = name.toLowerCase().split(".").pop()
  return ext === "pdf" || ext === "docx" ? ext : null
}

// Checks a chosen file before uploading. Returns an error message, or null.
export function checkResumeFile(file: { name: string; size: number }): string | null {
  const lower = file.name.toLowerCase()
  if (lower.endsWith(".doc")) return "Old Word files (.doc) aren't supported. Save it as .docx or PDF and try again."
  if (!fileKindFromName(file.name)) return "Please choose a PDF or Word (.docx) file."
  if (file.size === 0) return "That file is empty."
  if (file.size > MAX_RESUME_BYTES) return "That file is over 4 MB. Try saving a smaller PDF."
  return null
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
