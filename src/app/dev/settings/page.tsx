import { notFound } from "next/navigation"
import { PreviewSettings } from "./preview-settings"

// Development-only page: Settings without signing in. File reading is real;
// nothing is saved. Hidden in production.
export default function DevSettingsPage() {
  if (process.env.NODE_ENV !== "development") notFound()
  return (
    <div className="flex min-h-svh flex-col bg-muted/40 dark:bg-background">
      <div className="border-b bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-800 dark:text-amber-300">
        Preview: files are really read, but nothing is saved.
      </div>
      <PreviewSettings />
    </div>
  )
}
