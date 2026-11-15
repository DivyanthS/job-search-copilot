import { appIconPng } from "@/lib/app-icon"

// Home-screen icon for iPhone and iPad (iOS rounds the corners itself).
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return appIconPng(180, { rounded: false })
}
