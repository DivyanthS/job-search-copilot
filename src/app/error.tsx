"use client"

import { useEffect } from "react"
import Link from "next/link"
import { RotateCw } from "lucide-react"
import { LogoMark } from "@/components/logo"
import { Button } from "@/components/ui/button"

// Shown if a page crashes, instead of a blank screen.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoMark className="size-10" />
      <div>
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          This page didn&apos;t load properly. Your saved jobs are safe. Try again, or go back to your board.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => retry()}>
          <RotateCw /> Try again
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
          Go to my board
        </Button>
      </div>
    </div>
  )
}
