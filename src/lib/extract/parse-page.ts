import "server-only"

import { Readability } from "@mozilla/readability"
import { parseHTML } from "linkedom"
import type { WorkMode } from "@/lib/jobs"

// Details found directly in the page's structured data (most job sites
// include a schema.org "JobPosting" block for search engines).
export type PageHints = {
  title?: string
  company?: string
  location?: string
  salary?: string
  work_mode?: WorkMode
}

export type ParsedPage = {
  text: string // readable text of the job description
  hints: PageHints
  pageTitle: string
  hasJobPosting: boolean
}

const BLOCK_TAGS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DD", "DIV", "DL", "DT", "FIELDSET", "FIGCAPTION", "FIGURE",
  "FOOTER", "FORM", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN", "NAV", "OL", "P", "PRE",
  "SECTION", "TABLE", "TR", "UL",
])
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG", "IFRAME", "BUTTON", "INPUT", "SELECT"])

type MinimalNode = { nodeType: number; nodeName: string; textContent: string | null; childNodes: ArrayLike<MinimalNode> }

// Converts HTML to plain text, keeping paragraphs and bullet points.
export function htmlToText(html: string): string {
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`)
  return nodeToText(document.body as unknown as MinimalNode)
}

function nodeToText(root: MinimalNode): string {
  let out = ""
  const walk = (node: MinimalNode) => {
    if (node.nodeType === 3) {
      out += (node.textContent ?? "").replace(/\s+/g, " ")
      return
    }
    if (node.nodeType !== 1) return
    const tag = node.nodeName.toUpperCase()
    if (SKIP_TAGS.has(tag)) return
    if (tag === "BR") {
      out += "\n"
      return
    }
    const block = BLOCK_TAGS.has(tag)
    if (block) out += "\n"
    if (tag === "LI") out += "• "
    for (const child of Array.from(node.childNodes)) walk(child)
    if (block) out += "\n"
  }
  walk(root)
  return tidy(out)
}

export function tidy(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t ]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function parsePage(html: string): ParsedPage {
  const { document } = parseHTML(html)

  const pageTitle = (document.querySelector("title")?.textContent ?? "").trim()
  const meta = (name: string) =>
    document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.getAttribute("content")?.trim() ?? ""

  // 1. Structured data (most reliable when present).
  const posting = findJobPosting(document)
  const hints: PageHints = posting ? hintsFromPosting(posting) : {}
  const postingText = posting && typeof posting.description === "string" ? htmlToText(posting.description) : ""

  // 2. The readable article text (Readability is what Firefox's Reader View uses).
  let readable = ""
  try {
    const article = new Readability(document as unknown as Document, { charThreshold: 200 }).parse()
    if (article?.content) readable = htmlToText(article.content)
  } catch {
    // Some pages confuse Readability; fall back below.
  }
  if (readable.length < 200) {
    const { document: fresh } = parseHTML(html)
    const main = fresh.querySelector("main") ?? fresh.body
    readable = main ? nodeToText(main as unknown as MinimalNode) : ""
  }

  // Prefer the structured description if it's substantial.
  let text = postingText.length >= 300 ? postingText : readable
  if (!text) text = [meta("og:title"), meta("og:description") || meta("description")].filter(Boolean).join("\n\n")

  if (!hints.title) hints.title = meta("og:title") || undefined
  if (!hints.company) hints.company = meta("og:site_name") || undefined

  return { text: text.slice(0, 60000), hints, pageTitle, hasJobPosting: Boolean(posting) }
}

// ---------------------------------------------------------------------------
// schema.org JobPosting
// ---------------------------------------------------------------------------
type Json = Record<string, unknown>

function findJobPosting(document: { querySelectorAll: (s: string) => ArrayLike<{ textContent: string | null }> }): Json | null {
  for (const script of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
    let data: unknown
    try {
      data = JSON.parse(script.textContent ?? "")
    } catch {
      continue
    }
    const found = searchForPosting(data, 0)
    if (found) return found
  }
  return null
}

function searchForPosting(value: unknown, depth: number): Json | null {
  if (depth > 6 || !value || typeof value !== "object") return null
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = searchForPosting(item, depth + 1)
      if (found) return found
    }
    return null
  }
  const obj = value as Json
  const type = obj["@type"]
  if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) return obj
  if (obj["@graph"]) return searchForPosting(obj["@graph"], depth + 1)
  return null
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "")

function hintsFromPosting(p: Json): PageHints {
  const hints: PageHints = {}

  const title = str(p.title)
  if (title) hints.title = htmlToText(title)

  const org = (Array.isArray(p.hiringOrganization) ? p.hiringOrganization[0] : p.hiringOrganization) as Json | string | undefined
  const company = typeof org === "string" ? org : str(org?.name)
  if (company) hints.company = company

  const locations = (Array.isArray(p.jobLocation) ? p.jobLocation : p.jobLocation ? [p.jobLocation] : []) as Json[]
  const places = locations
    .map((loc) => {
      const address = (loc?.address ?? loc) as Json | string
      if (typeof address === "string") return address
      return [str(address?.addressLocality), str(address?.addressRegion), countryName(address?.addressCountry)]
        .filter(Boolean)
        .filter((part, i, all) => all.indexOf(part) === i)
        .join(", ")
    })
    .filter(Boolean)
  if (places.length) hints.location = places.slice(0, 3).join(" · ") + (places.length > 3 ? " +more" : "")

  const locationType = str(p.jobLocationType).toUpperCase()
  if (locationType === "TELECOMMUTE") hints.work_mode = places.length ? "hybrid" : "remote"
  if (locationType === "TELECOMMUTE" && !places.length) hints.location = hints.location ?? "Remote"

  const salary = formatSalary(p.baseSalary ?? p.estimatedSalary)
  if (salary) hints.salary = salary

  return hints
}

function countryName(value: unknown): string {
  if (typeof value === "string") return value.trim()
  if (value && typeof value === "object") return str((value as Json).name)
  return ""
}

function formatSalary(value: unknown): string {
  const s = (Array.isArray(value) ? value[0] : value) as Json | undefined
  if (!s || typeof s !== "object") return ""
  const currency = str(s.currency)
  const v = (s.value ?? {}) as Json
  const min = Number(v.minValue ?? (typeof v === "object" ? v.value : v))
  const max = Number(v.maxValue)
  const unit = str(v.unitText || s.unitText).toLowerCase()
  if (!Number.isFinite(min) && !Number.isFinite(max)) return ""

  const fmt = (n: number) => {
    try {
      return new Intl.NumberFormat("en", {
        style: currency ? "currency" : "decimal",
        currency: currency || undefined,
        maximumFractionDigits: 0,
        notation: n >= 10000 ? "compact" : "standard",
      }).format(n)
    } catch {
      return `${currency} ${n}`.trim()
    }
  }
  const range = Number.isFinite(min) && Number.isFinite(max) && max !== min ? `${fmt(min)}–${fmt(max)}` : fmt(Number.isFinite(min) ? min : max)
  const per = { year: " / year", month: " / month", week: " / week", day: " / day", hour: " / hour" }[unit] ?? ""
  return range + per
}
