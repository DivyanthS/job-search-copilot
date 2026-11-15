import { appIconPng } from "@/lib/app-icon"

// PNG icons listed in the web app manifest: /icons/192.png, /icons/512.png and
// /icons/maskable-512.png (Android's circle-cropped version).
const ICONS: Record<string, () => Response> = {
  "192.png": () => appIconPng(192),
  "512.png": () => appIconPng(512),
  "maskable-512.png": () => appIconPng(512, { rounded: false, inset: 0.28 }),
}

export function generateStaticParams() {
  return Object.keys(ICONS).map((file) => ({ file }))
}

export const dynamicParams = false

export async function GET(_request: Request, ctx: RouteContext<"/icons/[file]">) {
  const { file } = await ctx.params
  const make = ICONS[file]
  if (!make) return new Response("Not found", { status: 404 })
  return make()
}
