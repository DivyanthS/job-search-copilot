import { notFound } from "next/navigation"
import { PreviewAdmin } from "./preview-admin"

// Development-only page: the Admin page with sample people. Nothing is
// saved. Hidden in production.
export default function DevAdminPage() {
  if (process.env.NODE_ENV !== "development") notFound()
  return (
    <div className="flex min-h-svh flex-col bg-muted/40 dark:bg-background">
      <div className="border-b bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-800 dark:text-amber-300">
        Preview with sample people. Nothing here is saved.
      </div>
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Invite people and keep an eye on AI usage.</p>
        </div>
        <PreviewAdmin />
      </div>
    </div>
  )
}
