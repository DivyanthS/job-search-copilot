"use client"

import { useState, useTransition } from "react"
import { Loader2, UserRound } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SettingsActions } from "@/lib/resume"
import { SettingsCard } from "./settings-card"

export function ProfileCard({
  name,
  email,
  actions,
}: {
  name: string | null
  email: string
  actions: Pick<SettingsActions, "updateName">
}) {
  const [saved, setSaved] = useState(name ?? "")
  const [draft, setDraft] = useState(name ?? "")
  const [pending, startTransition] = useTransition()
  const dirty = draft.trim() !== saved

  return (
    <SettingsCard icon={UserRound} title="Your details" description="Your name is used to sign your cover letters.">
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          startTransition(async () => {
            const result = await actions.updateName(draft)
            if (result.ok) {
              setSaved(result.data ?? "")
              setDraft(result.data ?? "")
              toast.success("Name saved")
            } else {
              toast.error(result.error)
            }
          })
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="full-name">Full name</Label>
          <Input
            id="full-name"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. Alex Morgan"
            maxLength={100}
            autoComplete="name"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} readOnly disabled />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={!dirty || pending}>
            {pending && <Loader2 className="animate-spin" />}
            Save name
          </Button>
        </div>
      </form>
    </SettingsCard>
  )
}
