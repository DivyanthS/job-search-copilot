"use client"

import { useEffect, useRef, useState } from "react"
import { NotebookPen } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { MAX_NOTES } from "@/lib/job-details"
import { Section, type SaveFn } from "./section"

const SAVE_DELAY_MS = 1000

// Notes save on their own a moment after you stop typing, and when you leave
// the box or close the panel.
export function NotesSection({ initial, save }: { initial: string | null; save: SaveFn }) {
  const [draft, setDraft] = useState(initial ?? "")
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const saved = useRef(initial ?? "")
  const latest = useRef(draft)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveRef = useRef(save)

  useEffect(() => {
    saveRef.current = save
  }, [save])

  async function flush() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const value = latest.current
    if (value === saved.current) return
    setStatus("saving")
    const ok = await saveRef.current({ notes: value })
    if (ok) saved.current = value
    setStatus(ok ? "saved" : "error")
  }

  // Save anything unsaved when the panel closes.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
      if (latest.current !== saved.current) void saveRef.current({ notes: latest.current })
    }
  }, [])

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(e.target.value)
    latest.current = e.target.value
    setStatus("idle")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_DELAY_MS)
  }

  return (
    <Section
      icon={NotebookPen}
      title="Notes"
      action={
        <span aria-live="polite" className="text-xs text-muted-foreground">
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Not saved yet" : ""}
        </span>
      }
    >
      <Textarea
        aria-label="Notes"
        value={draft}
        onChange={onChange}
        onBlur={flush}
        maxLength={MAX_NOTES}
        placeholder="Anything worth remembering: what you talked about, questions to ask, how you felt about it…"
        className="min-h-28 resize-y"
      />
    </Section>
  )
}
