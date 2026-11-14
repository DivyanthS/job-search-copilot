import "server-only"

import mammoth from "mammoth"
import { extractText, getDocumentProxy } from "unpdf"
import { tidy } from "@/lib/extract/parse-page"
import type { ResumeFileKind } from "@/lib/resume"

export class ResumeReadError extends Error {}

// Identify the file by its contents, not just its name.
export function detectKind(bytes: Uint8Array): ResumeFileKind | null {
  const head = String.fromCharCode(...bytes.slice(0, 5))
  if (head === "%PDF-") return "pdf"
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return "docx" // ZIP (Word .docx)
  return null
}

export async function readResume(bytes: Uint8Array, kind: ResumeFileKind): Promise<string> {
  try {
    if (kind === "pdf") {
      const pdf = await getDocumentProxy(new Uint8Array(bytes))
      const { text } = await extractText(pdf, { mergePages: false })
      return cleanPdfText(Array.isArray(text) ? text.join("\n\n") : text)
    }
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
    // Word puts a blank line after every paragraph; one line break is enough.
    return tidy(value).replace(/\n{2,}/g, "\n")
  } catch (err) {
    const message = (err as Error)?.message ?? ""
    if (/password|encrypt/i.test(message)) {
      throw new ResumeReadError("That PDF is password-protected. Remove the password, or paste your resume text instead.")
    }
    console.error("readResume:", message)
    throw new ResumeReadError(
      kind === "pdf"
        ? "We couldn't read that PDF. Try exporting it again, or paste your resume text instead."
        : "We couldn't read that Word file. Try saving it again as .docx or PDF, or paste your resume text instead."
    )
  }
}

// PDF text often comes out with odd spacing; tidy it up a little.
function cleanPdfText(text: string) {
  return tidy(
    text
      .replace(/\u0000/g, "")
      .replace(/[•●▪‣⁃]\s*/g, "\n• ") // bullets start a new line
      .replace(/[ \t]{2,}/g, " ")
  )
}
