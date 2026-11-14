import type { Metadata } from "next"
import { FileText, KanbanSquare, Sparkles } from "lucide-react"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { getSupabaseEnv, isGoogleAuthEnabled } from "@/lib/supabase/env"
import { LOGIN_ERROR_MESSAGES, type LoginErrorCode } from "@/lib/auth-errors"
import { LoginForm } from "./login-form"

export const metadata: Metadata = { title: "Sign in" }

const FEATURES = [
  { icon: KanbanSquare, title: "One board for every application", text: "Drag jobs from Wishlist to Offer." },
  { icon: Sparkles, title: "A tailored kit in seconds", text: "Cover letter, resume bullets and interview prep." },
  { icon: FileText, title: "Ready to send", text: "Edit, then download as Word or PDF." },
]

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams
  const errorCode = typeof error === "string" && error in LOGIN_ERROR_MESSAGES ? (error as LoginErrorCode) : null
  const configured = getSupabaseEnv() !== null

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-zinc-950 p-10 text-zinc-50 lg:flex lg:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-40 size-[36rem] rounded-full bg-indigo-600/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -bottom-40 size-[32rem] rounded-full bg-violet-600/20 blur-3xl"
        />
        <div className="relative">
          <Logo />
        </div>
        <div className="relative mt-auto max-w-md space-y-8">
          <h2 className="text-3xl font-semibold tracking-tight text-balance">
            Your job search, organised, with an AI copilot for every application.
          </h2>
          <ul className="space-y-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="block text-sm text-zinc-400">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <span className="lg:invisible">
            <Logo />
          </span>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in with the email address you were invited with.
          </p>

          <div className="mt-8">
            {configured ? (
              <LoginForm
                googleEnabled={isGoogleAuthEnabled}
                initialError={errorCode ? LOGIN_ERROR_MESSAGES[errorCode] : null}
              />
            ) : (
              <SetupNotice />
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Invite-only. Ask the app owner if you need access.
        </p>
      </main>
    </div>
  )
}

function SetupNotice() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
      <p className="font-medium text-amber-700 dark:text-amber-400">Almost there: the app needs connecting</p>
      <p className="mt-1.5 text-muted-foreground">
        Supabase settings haven&apos;t been added yet. Follow the steps in{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">SETUP.md</code> to create{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>, then restart the app.
      </p>
    </div>
  )
}
