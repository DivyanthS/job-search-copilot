import Link from "next/link"
import { LogoMark } from "@/components/logo"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoMark className="size-10" />
      <div>
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          That page doesn&apos;t exist, or you don&apos;t have access to it.
        </p>
      </div>
      <Button nativeButton={false} render={<Link href="/" />}>Go to my board</Button>
    </div>
  )
}
