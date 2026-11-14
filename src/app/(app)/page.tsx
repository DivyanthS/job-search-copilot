import type { Metadata } from "next"
import { Board } from "@/components/board/board"
import { JOB_COLUMNS, type Job } from "@/lib/jobs"
import { requireProfile } from "@/lib/profile"
import { createClient } from "@/lib/supabase/server"
import { createJob, deleteJob, moveJob, updateJob } from "./actions"

export const metadata: Metadata = { title: "Board" }

export default async function BoardPage() {
  await requireProfile()
  const supabase = await createClient()
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(JOB_COLUMNS)
    .order("position", { ascending: true })
    .returns<Job[]>()

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-6 sm:px-6">
      {error ? (
        <BoardError />
      ) : (
        <Board initialJobs={jobs ?? []} actions={{ createJob, updateJob, moveJob, deleteJob }} />
      )}
    </div>
  )
}

function BoardError() {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border bg-card p-6 text-center">
      <h1 className="font-medium">Your board couldn&apos;t be loaded</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        If you just updated the app, make sure the latest database step in SETUP.md has been run
        (<code className="text-xs">0002_jobs.sql</code>). Otherwise, refresh the page to try again.
      </p>
    </div>
  )
}
