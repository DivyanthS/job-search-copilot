"use client"

import { useState } from "react"
import { Mail, Pencil, Phone, Plus, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MAX_CONTACTS, cleanContact } from "@/lib/job-details"
import type { Contact, JobDetails } from "@/lib/jobs"
import { EmptyHint, Section, type SaveFn } from "./section"

const EMPTY: Contact = { id: "", name: "", role: "", email: "", phone: "" }

export function ContactsSection({ job, save }: { job: JobDetails; save: SaveFn }) {
  // null = not editing; "" id = adding a new contact.
  const [editing, setEditing] = useState<Contact | null>(null)

  async function submit(contact: Contact) {
    const checked = cleanContact(contact)
    if ("error" in checked) return checked.error
    const exists = job.contacts.some((c) => c.id === checked.value.id)
    const contacts = exists
      ? job.contacts.map((c) => (c.id === checked.value.id ? checked.value : c))
      : [...job.contacts, checked.value]
    const ok = await save({ contacts })
    if (ok) setEditing(null)
    return ok ? null : "Couldn't save the contact."
  }

  return (
    <Section
      icon={Users}
      title="Contacts"
      action={
        !editing &&
        job.contacts.length < MAX_CONTACTS && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(EMPTY)}>
            <Plus /> Add
          </Button>
        )
      }
    >
      {job.contacts.length === 0 && !editing && (
        <EmptyHint>Keep track of recruiters and hiring managers you talk to.</EmptyHint>
      )}

      <ul className="space-y-1.5">
        {job.contacts.map((contact) =>
          editing?.id === contact.id ? (
            <li key={contact.id}>
              <ContactForm initial={contact} onCancel={() => setEditing(null)} onSubmit={submit} />
            </li>
          ) : (
            <li key={contact.id} className="group/row flex items-start gap-3 rounded-lg border px-3 py-2">
              <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {initialsOf(contact)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{contact.name || contact.email}</p>
                {contact.role && <p className="truncate text-xs text-muted-foreground">{contact.role}</p>}
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="inline-flex min-w-0 items-center gap-1 text-muted-foreground hover:text-foreground hover:underline">
                      <Mail className="size-3 shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline">
                      <Phone className="size-3 shrink-0" />
                      {contact.phone}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 sm:opacity-0 sm:group-hover/row:opacity-100 sm:focus-within:opacity-100">
                <Button size="icon-sm" variant="ghost" aria-label={`Edit ${contact.name || contact.email}`} onClick={() => setEditing(contact)} disabled={editing !== null}>
                  <Pencil />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove ${contact.name || contact.email}`}
                  onClick={() => save({ contacts: job.contacts.filter((c) => c.id !== contact.id) })}
                  disabled={editing !== null}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          )
        )}
      </ul>

      {editing && editing.id === "" && (
        <ContactForm initial={EMPTY} onCancel={() => setEditing(null)} onSubmit={submit} />
      )}
    </Section>
  )
}

function ContactForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: Contact
  onCancel: () => void
  onSubmit: (contact: Contact) => Promise<string | null>
}) {
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const field = (key: keyof Contact) => ({
    value: draft[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraft((d) => ({ ...d, [key]: e.target.value }))
      setError(null)
    },
  })
  const id = initial.id || "new"

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setError(await onSubmit(draft))
        setBusy(false)
      }}
      className="mt-2 space-y-3 rounded-lg border bg-muted/40 p-3"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`c-name-${id}`}>Name</Label>
          <Input id={`c-name-${id}`} {...field("name")} placeholder="e.g. Priya Shah" autoFocus maxLength={100} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`c-role-${id}`}>Role</Label>
          <Input id={`c-role-${id}`} {...field("role")} placeholder="e.g. Recruiter" maxLength={100} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`c-email-${id}`}>Email</Label>
          <Input id={`c-email-${id}`} type="email" {...field("email")} placeholder="name@company.com" maxLength={200} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`c-phone-${id}`}>Phone</Label>
          <Input id={`c-phone-${id}`} type="tel" {...field("phone")} maxLength={50} />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={busy}>
          {initial.id ? "Save contact" : "Add contact"}
        </Button>
      </div>
    </form>
  )
}

function initialsOf(contact: Contact) {
  const source = contact.name || contact.email
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (contact.name ? parts[1]?.[0] ?? "" : "")).toUpperCase() || "?"
}
