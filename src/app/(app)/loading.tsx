// Shown for a moment while a page loads.
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6" aria-busy="true" aria-label="Loading">
      <div className="mb-6 space-y-2">
        <div className="h-6 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-80 w-72 shrink-0 animate-pulse rounded-xl border bg-muted/50" />
        ))}
      </div>
    </div>
  )
}
