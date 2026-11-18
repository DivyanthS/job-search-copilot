import type { Metadata } from "next"
import { DemoAdmin } from "@/components/demo/demo-admin"

export const metadata: Metadata = { title: "Demo admin" }

export default function DemoAdminPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Invite people and keep an eye on AI usage.</p>
      </div>
      <DemoAdmin />
    </div>
  )
}
