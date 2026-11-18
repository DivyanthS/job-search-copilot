import type { Metadata } from "next"
import { DemoBoard } from "@/components/demo/demo-board"

export const metadata: Metadata = { title: "Demo" }

export default function DemoBoardPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-6 sm:px-6">
      <DemoBoard />
    </div>
  )
}
