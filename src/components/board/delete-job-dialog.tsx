"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
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
import type { Job } from "@/lib/jobs"

export function DeleteJobDialog({
  job,
  onCancel,
  onConfirm,
}: {
  job: Job | null
  onCancel: () => void
  // Returns an error message, or null when deleted.
  onConfirm: (job: Job) => Promise<string | null>
}) {
  // Keep showing the last job while the dialog animates closed.
  const [shown, setShown] = useState(job)
  if (job && job !== shown) setShown(job)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <AlertDialog
      open={job !== null}
      onOpenChange={(open) => {
        if (!open && !pending) {
          setError(null)
          onCancel()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this job?</AlertDialogTitle>
          <AlertDialogDescription>
            {shown ? (
              <>
                <span className="font-medium text-foreground">{shown.title}</span> at{" "}
                <span className="font-medium text-foreground">{shown.company}</span> will be removed from your
                board for good. This can&apos;t be undone.
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep it</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={() =>
              shown &&
              startTransition(async () => {
                setError(await onConfirm(shown))
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            Delete job
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
