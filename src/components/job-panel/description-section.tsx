"use client"

import { useState } from "react"
import { ChevronDown, FileText, Pencil, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MAX_DESCRIPTION } from "@/lib/jobs"
import { cn } from "@/lib/utils"
import { EmptyHint, Section, type SaveFn } from "./section"

export function DescriptionSection({ description, save }: { description: string | null; save: SaveFn }) {
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(description ?? "")
  const [busy, setBusy] = useState(false)
  const long = (description?.length ?? 0) > 600

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const ok = await save({ description: draft })
    setBusy(false)
    if (ok) setEditing(false)
  }

  return (
    <Section
      icon={FileText}
      title="Job description"
      action={
        !editing && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(description ?? "")
              setEditing(true)
            }}
          >
            {description ? <Pencil /> : <Plus />}
            {description ? "Edit" : "Add"}
          </Button>
        )
      }
    >
      {editing ? (
        <form onSubmit={submit} className="space-y-2">
          <Textarea
            aria-label="Job description"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_DESCRIPTION}
            placeholder="Paste the full job description here…"
            className="max-h-[60vh] min-h-48 resize-y"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              Save description
            </Button>
          </div>
        </form>
      ) : description ? (
        <div>
          <div
            className={cn(
              "relative overflow-hidden text-sm leading-relaxed whitespace-pre-line text-muted-foreground",
              long && !expanded && "max-h-40"
            )}
          >
            {description}
            {long && !expanded && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-popover to-transparent" />
            )}
          </div>
          {long && (
            <Button size="sm" variant="ghost" className="mt-1 -ml-2" onClick={() => setExpanded((v) => !v)}>
              <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} />
              {expanded ? "Show less" : "Show all"}
            </Button>
          )}
        </div>
      ) : (
        <EmptyHint>
          No job description saved. Adding one now will make your application kit much more tailored later.
        </EmptyHint>
      )}
    </Section>
  )
}
