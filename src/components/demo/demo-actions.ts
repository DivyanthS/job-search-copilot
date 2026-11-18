"use server"

import type { ActionResult } from "@/lib/jobs"
import { MIN_RESUME_CHARS, checkResumeFile, fileKindFromName, type Resume } from "@/lib/resume"
import { ResumeReadError, detectKind, readResume } from "@/lib/resume-reader"

// Demo Settings page: reads an uploaded resume with the real reader, without
// saving anything. Only on your own computer (npm run dev): on the live site
// the public demo doesn't accept files, so it can't be used to process uploads.
export async function demoReadResume(form: FormData): Promise<ActionResult<Resume>> {
  if (process.env.NODE_ENV !== "development") {
    return { ok: false, error: "Uploading files isn't available in the demo. Try pasting your resume as text instead." }
  }

  const file = form.get("file")
  if (!(file instanceof File)) return { ok: false, error: "Please choose a file to upload." }
  const problem = checkResumeFile(file)
  if (problem) return { ok: false, error: problem }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const kind = detectKind(bytes)
  if (!kind || kind !== fileKindFromName(file.name)) {
    return { ok: false, error: "That file doesn't look like a real PDF or Word document." }
  }
  try {
    const content = await readResume(bytes, kind)
    if (content.length < MIN_RESUME_CHARS) {
      return {
        ok: false,
        error:
          "We couldn't find much text in that file. It may be a scanned image. Try a different version, or paste your resume text instead.",
      }
    }
    return {
      ok: true,
      data: { content, file_name: file.name, file_size: file.size, file_type: kind, updated_at: new Date().toISOString() },
    }
  } catch (err) {
    return { ok: false, error: err instanceof ResumeReadError ? err.message : "We couldn't read that file." }
  }
}
