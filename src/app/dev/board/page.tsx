import { notFound } from "next/navigation"
import { PreviewBoard } from "./preview-board"

// Development-only page: the board with sample data and no database, for
// trying out the interface before Supabase is connected. Hidden in production.
export default function DevBoardPage() {
  if (process.env.NODE_ENV !== "development") notFound()
  return (
    <div className="flex min-h-svh flex-col bg-muted/40 dark:bg-background">
      <div className="border-b bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-800 dark:text-amber-300">
        Preview with sample data. Nothing here is saved.
      </div>
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-6 sm:px-6">
        <PreviewBoard />
      </div>
    </div>
  )
}
