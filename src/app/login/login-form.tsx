"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { ArrowLeft, Loader2, Mail, MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sendMagicLink, signInWithGoogle, type MagicLinkState } from "./actions"

export function LoginForm({
  googleEnabled,
  initialError,
}: {
  googleEnabled: boolean
  initialError: string | null
}) {
  const [state, formAction] = useActionState<MagicLinkState, FormData>(sendMagicLink, { status: "idle" })
  const [dismissedSent, setDismissedSent] = useState(false)

  if (state.status === "sent" && !dismissedSent) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <span className="mx-auto inline-flex size-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <MailCheck className="size-5" />
        </span>
        <h2 className="mt-4 font-medium">Check your inbox</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          We sent a sign-in link to <span className="font-medium text-foreground">{state.email}</span>.
          Open it on this device to continue. Check your spam folder if it isn&apos;t there in a minute.
        </p>
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => setDismissedSent(true)}>
          <ArrowLeft /> Use a different email
        </Button>
      </div>
    )
  }

  const error = state.status === "error" ? state.message : initialError

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <form action={(fd) => { setDismissedSent(false); return formAction(fd) }} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            className="h-10"
          />
        </div>
        <SubmitButton />
      </form>

      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <form action={signInWithGoogle}>
            <GoogleButton />
          </form>
        </>
      )}
    </div>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" className="h-10 w-full" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Mail />}
      {pending ? "Sending link…" : "Email me a sign-in link"}
    </Button>
  )
}

function GoogleButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="outline" size="lg" className="h-10 w-full" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
      Continue with Google
    </Button>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8l4-3z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  )
}
