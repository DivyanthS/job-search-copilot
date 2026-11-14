"use client"

import { createContext } from "react"
import { localToday } from "@/lib/jobs"
import type { KitEvent, KitGenerator } from "@/lib/kit"

// Asks the server to write a kit and passes each streamed event to `onEvent`.
export const streamKitFromServer: KitGenerator = async (jobId, { retry }, onEvent) => {
  let response: Response
  try {
    response = await fetch(`/api/kits/${encodeURIComponent(jobId)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ retry, today: localToday() }),
    })
  } catch {
    onEvent({ type: "error", error: "Couldn't reach the app. Check your connection and try again." })
    return
  }

  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    onEvent({ type: "error", error: body?.error ?? "Something went wrong. Please try again." })
    return
  }

  let finished = false
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ""
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += value
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        if (!line.trim()) continue
        let event: KitEvent
        try {
          event = JSON.parse(line)
        } catch {
          continue
        }
        if (event.type === "done" || event.type === "error") finished = true
        onEvent(event)
      }
    }
  } catch {
    // handled below
  }
  if (!finished) {
    onEvent({
      type: "error",
      error: "The connection dropped while your kit was being written. It may still finish saving. Close and reopen this job in a minute.",
    })
  }
}

// The board uses the real server; the development preview swaps in a stand-in.
export const KitGeneratorContext = createContext<KitGenerator>(streamKitFromServer)
