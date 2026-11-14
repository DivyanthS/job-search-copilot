// Application kits: shared by the browser and the server.

export const KIT_SECTIONS = [
  { id: "cover_letter", label: "Cover letter", fileLabel: "Cover letter" },
  { id: "resume_bullets", label: "Resume bullets", fileLabel: "Resume bullets" },
  { id: "interview_questions", label: "Interview questions", fileLabel: "Interview questions" },
  { id: "company_brief", label: "Company brief", fileLabel: "Company brief" },
] as const

export type KitSectionId = (typeof KIT_SECTIONS)[number]["id"]

export const KIT_SECTION_LIMITS: Record<KitSectionId, number> = {
  cover_letter: 20000,
  resume_bullets: 20000,
  interview_questions: 20000,
  company_brief: 30000,
}

export function isKitSectionId(value: unknown): value is KitSectionId {
  return KIT_SECTIONS.some((s) => s.id === value)
}

export type KitSource = { url: string; title: string }

export type Kit = Record<KitSectionId, string | null> & {
  sources: KitSource[]
  model: string | null
  generated_at: string
  updated_at: string
}

export const KIT_COLUMNS =
  "cover_letter, resume_bullets, interview_questions, company_brief, sources, model, generated_at, updated_at"

export type KitUsage = { used: number; limit: number }

// What the Kit tab needs to show before generating.
export type KitInfo = {
  kit: Kit | null
  usage: KitUsage
  hasResume: boolean
  hasDescription: boolean
  aiReady: boolean
}

// Messages streamed from the server while a kit is written (one JSON object
// per line).
export type KitEvent =
  | { type: "start"; sections: KitSectionId[] }
  | { type: "delta"; section: KitSectionId; text: string }
  | { type: "section_done"; section: KitSectionId }
  | { type: "section_error"; section: KitSectionId; error: string }
  | { type: "done"; kit: Kit; usage: KitUsage }
  | { type: "error"; error: string }

export type KitGenerator = (
  jobId: string,
  options: { retry: boolean },
  onEvent: (event: KitEvent) => void
) => Promise<void>

// Sections that came back empty (e.g. after a failed run).
export function missingSections(kit: Kit | null): KitSectionId[] {
  if (!kit) return KIT_SECTIONS.map((s) => s.id)
  return KIT_SECTIONS.map((s) => s.id).filter((id) => !kit[id]?.trim())
}
