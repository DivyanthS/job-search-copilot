import type { Metadata } from "next"
import { DemoSettings } from "@/components/demo/demo-settings"

export const metadata: Metadata = { title: "Demo settings" }

export default function DemoSettingsPage() {
  return <DemoSettings />
}
