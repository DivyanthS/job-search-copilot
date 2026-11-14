"use client"

import type { KitSource } from "@/lib/kit"
import { parseKitText } from "./kit-text"

// Builds Word (.docx) and PDF files in the browser. The libraries are loaded
// only when someone actually downloads, so they don't slow down the board.

export type ExportPart = { heading?: string; text: string; sources?: KitSource[] }
export type ExportDoc = { fileName: string; title?: string; subtitle?: string; parts: ExportPart[] }

const stripLinks = (text: string) => text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1")

export function safeFileName(...pieces: string[]) {
  return pieces
    .filter(Boolean)
    .join(" - ")
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// ---------------------------------------------------------------------------
// Word
// ---------------------------------------------------------------------------
export async function downloadDocx(doc: ExportDoc) {
  const { Document, HeadingLevel, Packer, PageBreak, Paragraph, TextRun } = await import("docx")
  type P = InstanceType<typeof Paragraph>
  const children: P[] = []

  if (doc.title) children.push(new Paragraph({ text: doc.title, heading: HeadingLevel.TITLE }))
  if (doc.subtitle) {
    children.push(new Paragraph({ children: [new TextRun({ text: doc.subtitle, color: "666666" })], spacing: { after: 240 } }))
  }

  doc.parts.forEach((part, index) => {
    if (index > 0 && doc.parts.length > 1) children.push(new Paragraph({ children: [new PageBreak()] }))
    if (part.heading) children.push(new Paragraph({ text: part.heading, heading: HeadingLevel.HEADING_1 }))

    for (const block of parseKitText(part.text)) {
      if (block.kind === "heading") {
        children.push(new Paragraph({ text: stripLinks(block.text), heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }))
      } else if (block.kind === "bullets") {
        for (const item of block.items) children.push(new Paragraph({ text: stripLinks(item), bullet: { level: 0 } }))
      } else {
        children.push(
          new Paragraph({
            spacing: { after: 200 },
            children: block.lines.map((line, i) => new TextRun({ text: stripLinks(line), break: i > 0 ? 1 : 0 })),
          })
        )
      }
    }

    if (part.sources?.length) {
      children.push(new Paragraph({ text: "Sources", heading: HeadingLevel.HEADING_2, spacing: { before: 240 } }))
      for (const s of part.sources) {
        children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(`${s.title} — `), new TextRun({ text: s.url, color: "1155CC" })] }))
      }
    }
  })

  const file = new Document({
    creator: "Job Copilot",
    title: doc.title ?? doc.fileName,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ properties: {}, children }],
  })
  saveBlob(await Packer.toBlob(file), `${doc.fileName}.docx`)
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

// The built-in PDF fonts only cover Western European characters; swap or drop
// anything else so it doesn't print as garbage.
const CP1252_EXTRAS = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ"
function pdfSafe(text: string) {
  return stripLinks(text)
    .replace(/[→⇒]/g, "->")
    .replace(/[←]/g, "<-")
    .replace(/[✓✔]/g, "-")
    .replace(/[‐‑‒]/g, "-")
    .replace(/[   ]/g, " ")
    .split("")
    .filter((ch) => {
      const code = ch.charCodeAt(0)
      return ch === "\n" || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || CP1252_EXTRAS.includes(ch)
    })
    .join("")
}

export async function downloadPdf(doc: ExportDoc) {
  const { jsPDF } = await import("jspdf")
  const pdf = new jsPDF({ unit: "pt", format: "a4" })
  const margin = 56
  const width = pdf.internal.pageSize.getWidth() - margin * 2
  const bottom = pdf.internal.pageSize.getHeight() - margin
  let y = margin

  const ensure = (height: number) => {
    if (y + height > bottom) {
      pdf.addPage()
      y = margin
    }
  }

  const write = (text: string, { size = 11, bold = false, indent = 0, color = 30, gapAfter = 0 } = {}) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal")
    pdf.setFontSize(size)
    pdf.setTextColor(color)
    const lineHeight = size * 1.4
    const lines: string[] = pdf.splitTextToSize(pdfSafe(text), width - indent)
    for (const line of lines) {
      ensure(lineHeight)
      pdf.text(line, margin + indent, y + size)
      y += lineHeight
    }
    y += gapAfter
  }

  if (doc.title) write(doc.title, { size: 18, bold: true, gapAfter: 2 })
  if (doc.subtitle) write(doc.subtitle, { size: 11, color: 110, gapAfter: 14 })

  doc.parts.forEach((part, index) => {
    if (index > 0 && doc.parts.length > 1) {
      pdf.addPage()
      y = margin
    }
    if (part.heading) write(part.heading, { size: 15, bold: true, gapAfter: 8 })

    for (const block of parseKitText(part.text)) {
      if (block.kind === "heading") {
        y += 4
        write(block.text, { size: 12, bold: true, gapAfter: 4 })
      } else if (block.kind === "bullets") {
        for (const item of block.items) {
          pdf.setFont("helvetica", "normal")
          pdf.setFontSize(11)
          const lines: string[] = pdf.splitTextToSize(pdfSafe(item), width - 14)
          ensure(15.4)
          pdf.setTextColor(30)
          pdf.text("•", margin + 2, y + 11)
          for (const line of lines) {
            ensure(15.4)
            pdf.text(line, margin + 14, y + 11)
            y += 15.4
          }
          y += 3
        }
        y += 6
      } else {
        for (const line of block.lines) write(line)
        y += 9
      }
    }

    if (part.sources?.length) {
      y += 6
      write("Sources", { size: 12, bold: true, gapAfter: 4 })
      for (const s of part.sources) write(`${s.title} — ${s.url}`, { size: 9, color: 90, gapAfter: 2 })
    }
  })

  saveBlob(pdf.output("blob"), `${doc.fileName}.pdf`)
}
