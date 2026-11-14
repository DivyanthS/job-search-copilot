import type { Metadata } from "next"
import { Inbox } from "lucide-react"
import { COLUMNS } from "@/lib/columns"
import { displayName, requireProfile } from "@/lib/profile"

export const metadata: Metadata = { title: "Board" }

export default async function BoardPage() {
  const profile = await requireProfile()
  const firstName = displayName(profile).split(" ")[0]

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Hi {firstName}, here&apos;s your pipeline</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Adding jobs is coming in the next update. For now, this is where your board will live.
        </p>
      </div>

      <div className="-mx-4 flex flex-1 snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
        {COLUMNS.map((col) => (
          <section
            key={col.id}
            aria-label={col.label}
            className="flex w-[78vw] max-w-80 min-w-64 shrink-0 snap-start flex-col rounded-xl border bg-card/60 sm:w-72"
          >
            <header className="flex items-center gap-2 px-3 py-2.5">
              <span className={`size-2 rounded-full ${col.dot}`} />
              <h2 className="text-sm font-medium">{col.label}</h2>
              <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground tabular-nums">
                0
              </span>
            </header>
            <div className="m-2 mt-0 flex min-h-40 flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
              {col.id === "wishlist" ? (
                <>
                  <Inbox className="size-5 opacity-60" />
                  Jobs you save will appear here
                </>
              ) : (
                "Nothing here yet"
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
