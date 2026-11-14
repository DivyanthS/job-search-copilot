import { Fragment } from "react"
import { cn } from "@/lib/utils"

// Kit text uses a tiny format: "# " starts a heading, "- " a bullet, and a
// blank line separates paragraphs. Links can appear as [text](https://…).

export type Block =
  | { kind: "heading"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "paragraph"; lines: string[] }

export function parseKitText(text: string): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []
  let bullets: string[] = []

  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", lines: paragraph })
    if (bullets.length) blocks.push({ kind: "bullets", items: bullets })
    paragraph = []
    bullets = []
  }

  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      flush()
    } else if (/^#{1,6}\s+/.test(line)) {
      flush()
      blocks.push({ kind: "heading", text: line.replace(/^#{1,6}\s+/, "") })
    } else if (/^\s*[-*•]\s+/.test(line)) {
      if (paragraph.length) flush()
      bullets.push(line.replace(/^\s*[-*•]\s+/, ""))
    } else {
      if (bullets.length) flush()
      paragraph.push(line.trim())
    }
  }
  flush()
  return blocks
}

// Plain text for copying into application forms.
export function toPlainText(text: string) {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .trim()
}

const LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g

function Inline({ text }: { text: string }) {
  const parts: React.ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(LINK)) {
    parts.push(text.slice(last, match.index))
    parts.push(
      <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
        {match[1]}
      </a>
    )
    last = match.index! + match[0].length
  }
  parts.push(text.slice(last))
  return <>{parts}</>
}

export function KitText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("space-y-3 text-sm leading-relaxed", className)}>
      {parseKitText(text).map((block, i) => {
        if (block.kind === "heading") {
          return (
            <h4 key={i} className="pt-1 font-semibold text-foreground">
              <Inline text={block.text} />
            </h4>
          )
        }
        if (block.kind === "bullets") {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-muted-foreground">
              {block.items.map((item, j) => (
                <li key={j}>
                  <Inline text={item} />
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i}>
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <Inline text={line} />
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}
