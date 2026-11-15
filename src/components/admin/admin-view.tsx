"use client"

import { useState, useTransition } from "react"
import { Check, Copy, Loader2, MailPlus, Pencil, Sparkles, Trash2, Users, Wallet } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDate } from "@/components/board/job-meta"
import { SettingsCard } from "@/components/settings/settings-card"
import { MAX_KIT_LIMIT, checkKitLimit, cleanEmail, formatCost, inviteMessage, type AdminActions, type Person } from "@/lib/admin"
import { cn } from "@/lib/utils"

export function AdminView({
  initialPeople,
  siteUrl,
  actions,
}: {
  initialPeople: Person[]
  siteUrl: string
  actions: AdminActions
}) {
  const [people, setPeople] = useState(initialPeople)
  const [justInvited, setJustInvited] = useState<string | null>(null)
  const [withdrawing, setWithdrawing] = useState<Person | null>(null)

  const totals = people.reduce(
    (sum, p) => ({
      kits: sum.kits + p.kitsThisMonth,
      month: sum.month + p.costThisMonth,
      all: sum.all + p.costTotal,
    }),
    { kits: 0, month: 0, all: 0 }
  )
  const active = people.filter((p) => p.status === "active")
  const invited = people.filter((p) => p.status === "invited")

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={Sparkles} label="Kits this month" value={String(totals.kits)} />
        <Stat icon={Wallet} label="AI cost this month" value={formatCost(totals.month)} />
        <Stat icon={Wallet} label="AI cost all time" value={formatCost(totals.all)} />
      </div>

      <InviteCard
        actions={actions}
        siteUrl={siteUrl}
        justInvited={justInvited}
        onInvited={(person) => {
          setPeople((prev) => [...prev, person])
          setJustInvited(person.email)
        }}
      />

      <SettingsCard
        icon={Users}
        title="People"
        description={`${active.length} with an account${invited.length ? ` · ${invited.length} invited, not joined yet` : ""}. Kit allowances reset on the 1st of each month.`}
      >
        <ul className="-my-1 divide-y">
          {[...active, ...invited].map((person) => (
            <PersonRow
              key={person.key}
              person={person}
              siteUrl={siteUrl}
              actions={actions}
              onLimitChange={(limit) =>
                setPeople((prev) => prev.map((p) => (p.key === person.key ? { ...p, kitLimit: limit } : p)))
              }
              onWithdraw={() => setWithdrawing(person)}
            />
          ))}
        </ul>
      </SettingsCard>

      <AlertDialog open={withdrawing !== null} onOpenChange={(open) => !open && setWithdrawing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw this invite?</AlertDialogTitle>
            <AlertDialogDescription>
              {withdrawing?.email} won&apos;t be able to sign up. You can invite them again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep invite</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (!withdrawing) return
                const result = await actions.revokeInvite(withdrawing.email)
                if (!result.ok) return toast.error(result.error)
                setPeople((prev) => prev.filter((p) => p.key !== withdrawing.key))
                if (justInvited === withdrawing.email) setJustInvited(null)
                setWithdrawing(null)
                toast.success("Invite withdrawn")
              }}
            >
              Withdraw invite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-xs">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
    </div>
  )
}

function InviteCard({
  actions,
  siteUrl,
  justInvited,
  onInvited,
}: {
  actions: AdminActions
  siteUrl: string
  justInvited: string | null
  onInvited: (person: Person) => void
}) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <SettingsCard
      icon={MailPlus}
      title="Invite someone"
      description="Only people you invite can create an account. Each person gets their own private board."
    >
      <form
        noValidate
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault()
          const checked = cleanEmail(email)
          if ("error" in checked) return setError(checked.error)
          setError(null)
          startTransition(async () => {
            const result = await actions.invite(checked.email)
            if (!result.ok) return setError(result.error)
            onInvited(result.data)
            setEmail("")
            toast.success("Invite added")
          })
        }}
      >
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="invite-email">Their email address</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            placeholder="friend@example.com"
            autoComplete="off"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <MailPlus />}
          Add invite
        </Button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}

      {justInvited && (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <p className="text-sm font-medium">
            {justInvited} can now sign up. Send them this message by email or chat:
          </p>
          <p className="mt-2 rounded-md bg-background px-3 py-2 text-sm whitespace-pre-line text-muted-foreground ring-1 ring-border">
            {inviteMessage(justInvited, siteUrl)}
          </p>
          <div className="mt-2">
            <CopyButton text={inviteMessage(justInvited, siteUrl)} label="Copy message" />
          </div>
        </div>
      )}
    </SettingsCard>
  )
}

function PersonRow({
  person,
  siteUrl,
  actions,
  onLimitChange,
  onWithdraw,
}: {
  person: Person
  siteUrl: string
  actions: AdminActions
  onLimitChange: (limit: number) => void
  onWithdraw: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(person.kitLimit))
  const [pending, startTransition] = useTransition()
  const share = person.kitLimit > 0 ? Math.min(1, person.kitsThisMonth / person.kitLimit) : 1

  function saveLimit(e: React.FormEvent) {
    e.preventDefault()
    if (!person.userId) return
    const checked = checkKitLimit(Number(draft))
    if ("error" in checked) return toast.error(checked.error)
    startTransition(async () => {
      const result = await actions.setKitLimit(person.userId!, checked.limit)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      onLimitChange(result.data)
      setEditing(false)
      toast.success(`Limit for ${person.name || person.email} set to ${result.data} a month`)
    })
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 py-3">
      {/* Who */}
      <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
        <span
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium",
            person.status === "active" ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white" : "border border-dashed text-muted-foreground"
          )}
        >
          {(person.name || person.email).slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium">
            <span className="truncate">{person.name || person.email}</span>
            {person.role === "admin" && <Badge variant="secondary">Admin</Badge>}
            {person.isSelf && <Badge variant="outline">You</Badge>}
          </p>
          <p className="truncate text-xs text-muted-foreground" suppressHydrationWarning>
            {person.name ? `${person.email} · ` : ""}
            {person.status === "active" ? `Joined ${formatDate(person.since)}` : `Invited ${formatDate(person.since)}, not joined yet`}
          </p>
        </div>
      </div>

      {person.status === "active" ? (
        <>
          {/* Kits this month */}
          <div className="w-44">
            {editing ? (
              <form onSubmit={saveLimit} noValidate className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  max={MAX_KIT_LIMIT}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  aria-label={`Monthly kit limit for ${person.name || person.email}`}
                  className="h-8 w-20"
                  autoFocus
                />
                <Button type="submit" size="icon-sm" aria-label="Save limit" disabled={pending}>
                  {pending ? <Loader2 className="animate-spin" /> : <Check />}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
                  Cancel
                </Button>
              </form>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Kits this month</span>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(String(person.kitLimit))
                      setEditing(true)
                    }}
                    className="inline-flex items-center gap-1 rounded font-medium tabular-nums hover:underline"
                    aria-label={`Change monthly kit limit for ${person.name || person.email}`}
                  >
                    {person.kitsThisMonth} / {person.kitLimit}
                    <Pencil className="size-3 text-muted-foreground" />
                  </button>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      person.kitLimit === 0
                        ? "bg-muted-foreground/30"
                        : share >= 1
                          ? "bg-rose-500"
                          : share >= 0.8
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                    )}
                    style={{ width: `${person.kitLimit === 0 ? 100 : share * 100}%` }}
                  />
                </div>
                {person.kitLimit === 0 && <p className="mt-1 text-[11px] text-muted-foreground">Kits switched off</p>}
              </>
            )}
          </div>

          {/* Cost */}
          <div className="w-24 text-right text-xs sm:w-28">
            <p className="font-medium tabular-nums">{formatCost(person.costThisMonth)}</p>
            <p className="text-muted-foreground tabular-nums">
              {formatCost(person.costTotal)} all time
            </p>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-1.5">
          <CopyButton text={inviteMessage(person.email, siteUrl)} label="Copy invite" size="sm" />
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onWithdraw}>
            <Trash2 /> Withdraw
          </Button>
        </div>
      )}
    </li>
  )
}

function CopyButton({ text, label, size = "default" }: { text: string; label: string; size?: "sm" | "default" }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      size={size}
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          toast.error("Couldn't copy. Select the text and copy it instead.")
        }
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : label}
    </Button>
  )
}
