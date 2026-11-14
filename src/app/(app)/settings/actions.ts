"use server"

import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/jobs"
import {
  MAX_RESUME_CHARS,
  MIN_RESUME_CHARS,
  RESUME_COLUMNS,
  RESUME_FILE_TYPES,
  checkResumeFile,
  fileKindFromName,
  type Resume,
} from "@/lib/resume"
import { ResumeReadError, detectKind, readResume } from "@/lib/resume-reader"

const SIGNED_OUT = "You've been signed out. Please refresh the page and sign in again."
const BUCKET = "resumes"

async function signedIn() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  return userId ? { supabase, userId } : null
}

export async function uploadResume(form: FormData): Promise<ActionResult<Resume>> {
  const session = await signedIn()
  if (!session) return { ok: false, error: SIGNED_OUT }
  const { supabase, userId } = session

  const file = form.get("file")
  if (!(file instanceof File)) return { ok: false, error: "Please choose a file to upload." }
  const problem = checkResumeFile(file)
  if (problem) return { ok: false, error: problem }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const kind = detectKind(bytes)
  if (!kind || kind !== fileKindFromName(file.name)) {
    return { ok: false, error: "That file doesn't look like a real PDF or Word document." }
  }

  let content: string
  try {
    content = await readResume(bytes, kind)
  } catch (err) {
    return { ok: false, error: err instanceof ResumeReadError ? err.message : "We couldn't read that file." }
  }
  if (content.length < MIN_RESUME_CHARS) {
    return {
      ok: false,
      error:
        "We couldn't find much text in that file. It may be a scanned image. Try a different version, or paste your resume text instead.",
    }
  }

  // Keep the original file (replacing any earlier one).
  const path = `${userId}/resume.${kind}`
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: RESUME_FILE_TYPES[kind],
    upsert: true,
  })
  if (uploadError) {
    console.error("uploadResume storage:", uploadError.message)
    return { ok: false, error: "Couldn't save your file. Please try again." }
  }
  const otherKind = kind === "pdf" ? "docx" : "pdf"
  await supabase.storage.from(BUCKET).remove([`${userId}/resume.${otherKind}`])

  const { data, error } = await supabase
    .from("resumes")
    .upsert({
      user_id: userId,
      content: content.slice(0, MAX_RESUME_CHARS),
      file_path: path,
      file_name: file.name.slice(0, 255),
      file_size: file.size,
      file_type: kind,
    })
    .select(RESUME_COLUMNS)
    .single<Resume>()

  if (error || !data) {
    console.error("uploadResume row:", error?.message)
    return { ok: false, error: "Couldn't save your resume. Please try again." }
  }
  return { ok: true, data }
}

export async function saveResumeText(text: string): Promise<ActionResult<Resume>> {
  const session = await signedIn()
  if (!session) return { ok: false, error: SIGNED_OUT }

  const content = String(text ?? "").trim()
  if (content.length < MIN_RESUME_CHARS) {
    return { ok: false, error: "That's quite short for a resume. Paste the whole thing, including your experience." }
  }
  if (content.length > MAX_RESUME_CHARS) {
    return { ok: false, error: `That's too long (${MAX_RESUME_CHARS.toLocaleString()} characters max).` }
  }

  // Only the text changes; any uploaded file stays as it is.
  const { data, error } = await session.supabase
    .from("resumes")
    .upsert({ user_id: session.userId, content })
    .select(RESUME_COLUMNS)
    .single<Resume>()

  if (error || !data) {
    console.error("saveResumeText:", error?.message)
    return { ok: false, error: "Couldn't save your resume. Please try again." }
  }
  return { ok: true, data }
}

export async function deleteResume(): Promise<ActionResult<null>> {
  const session = await signedIn()
  if (!session) return { ok: false, error: SIGNED_OUT }
  const { supabase, userId } = session

  await supabase.storage.from(BUCKET).remove([`${userId}/resume.pdf`, `${userId}/resume.docx`])
  const { error } = await supabase.from("resumes").delete().eq("user_id", userId)
  if (error) {
    console.error("deleteResume:", error.message)
    return { ok: false, error: "Couldn't remove your resume. Please try again." }
  }
  return { ok: true, data: null }
}

// A short-lived private link to download the original file.
export async function getResumeDownloadUrl(): Promise<ActionResult<string>> {
  const session = await signedIn()
  if (!session) return { ok: false, error: SIGNED_OUT }

  const { data: row } = await session.supabase
    .from("resumes")
    .select("file_path, file_name")
    .eq("user_id", session.userId)
    .maybeSingle()
  if (!row?.file_path) return { ok: false, error: "There's no uploaded file to download." }

  const { data, error } = await session.supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.file_path, 60, { download: row.file_name ?? true })
  if (error || !data) {
    console.error("getResumeDownloadUrl:", error?.message)
    return { ok: false, error: "Couldn't prepare the download. Please try again." }
  }
  return { ok: true, data: data.signedUrl }
}

export async function updateName(name: string): Promise<ActionResult<string | null>> {
  const session = await signedIn()
  if (!session) return { ok: false, error: SIGNED_OUT }

  const fullName = String(name ?? "").trim().slice(0, 100) || null
  const { error } = await session.supabase.from("profiles").update({ full_name: fullName }).eq("id", session.userId)
  if (error) {
    console.error("updateName:", error.message)
    return { ok: false, error: "Couldn't save your name. Please try again." }
  }
  return { ok: true, data: fullName }
}
