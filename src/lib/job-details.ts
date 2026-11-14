import { MAX_DESCRIPTION, isIsoDate, type Contact, type DetailsPatch, type Interview } from "@/lib/jobs"

export const MAX_NOTES = 20000
export const MAX_CONTACTS = 20
export const MAX_INTERVIEWS = 30

export const INTERVIEW_LABELS = [
  "Phone screen",
  "Recruiter call",
  "Hiring manager",
  "Technical interview",
  "Take-home task",
  "Panel interview",
  "Final round",
  "Other",
]

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max)

export function cleanContact(raw: Partial<Contact>): { error: string } | { value: Contact } {
  const contact: Contact = {
    id: text(raw.id, 64) || newId(),
    name: text(raw.name, 100),
    role: text(raw.role, 100),
    email: text(raw.email, 200).toLowerCase(),
    phone: text(raw.phone, 50),
  }
  if (!contact.name && !contact.email) return { error: "Add at least a name or an email for the contact." }
  if (contact.email && !EMAIL.test(contact.email)) return { error: "That email address doesn't look right." }
  return { value: contact }
}

export function cleanInterview(raw: Partial<Interview>): { error: string } | { value: Interview } {
  const interview: Interview = {
    id: text(raw.id, 64) || newId(),
    date: text(raw.date, 10),
    time: text(raw.time, 5),
    label: text(raw.label, 100) || "Interview",
  }
  if (!isIsoDate(interview.date)) return { error: "Pick a date for the interview." }
  if (interview.time && !TIME.test(interview.time)) return { error: "That time doesn't look right." }
  return { value: interview }
}

// Checks a change from the job panel. Returns an error message, or the
// cleaned values ready to save.
export function validateDetailsPatch(patch: DetailsPatch): { error: string } | { value: Record<string, unknown> } {
  const value: Record<string, unknown> = {}

  if (patch.priority !== undefined) {
    const p = Number(patch.priority)
    if (!Number.isInteger(p) || p < 0 || p > 3) return { error: "Priority must be 0 to 3 stars." }
    value.priority = p
  }

  for (const field of ["applied_on", "follow_up_on"] as const) {
    if (patch[field] === undefined) continue
    const date = patch[field]
    if (date !== null && !isIsoDate(String(date))) return { error: "That date doesn't look right." }
    value[field] = date
  }

  if (patch.notes !== undefined) {
    const notes = String(patch.notes)
    if (notes.length > MAX_NOTES) return { error: `Notes are too long (${MAX_NOTES.toLocaleString()} characters max).` }
    value.notes = notes.trim() ? notes : null
  }

  if (patch.description !== undefined) {
    const description = String(patch.description).trim()
    if (description.length > MAX_DESCRIPTION) return { error: "The job description is too long." }
    value.description = description || null
  }

  if (patch.contacts !== undefined) {
    if (!Array.isArray(patch.contacts) || patch.contacts.length > MAX_CONTACTS) {
      return { error: `You can save up to ${MAX_CONTACTS} contacts.` }
    }
    const contacts: Contact[] = []
    for (const raw of patch.contacts) {
      const checked = cleanContact(raw)
      if ("error" in checked) return checked
      contacts.push(checked.value)
    }
    value.contacts = contacts
  }

  if (patch.interviews !== undefined) {
    if (!Array.isArray(patch.interviews) || patch.interviews.length > MAX_INTERVIEWS) {
      return { error: `You can save up to ${MAX_INTERVIEWS} interviews.` }
    }
    const interviews: Interview[] = []
    for (const raw of patch.interviews) {
      const checked = cleanInterview(raw)
      if ("error" in checked) return checked
      interviews.push(checked.value)
    }
    interviews.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    value.interviews = interviews
  }

  if (Object.keys(value).length === 0) return { error: "Nothing to save." }
  return { value }
}
