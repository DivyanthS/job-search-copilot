import "server-only"

// Types and helpers shared by the AI providers (OpenAI and OpenRouter).

export class AIError extends Error {
  constructor(
    public kind: "not_configured" | "unavailable" | "bad_response",
    message: string
  ) {
    super(message)
  }
}

export type AIUsage = { promptTokens: number; completionTokens: number; cost?: number }

export type JsonSchema = Record<string, unknown>

export type GenerateJsonOptions = {
  model: string
  system: string
  prompt: string
  schemaName: string
  schema: JsonSchema
  maxTokens?: number
  timeoutMs?: number
}

export type StreamTextOptions = {
  model: string
  system: string
  prompt: string
  maxTokens?: number
  webSearch?: boolean
  timeoutMs?: number
  onDelta: (text: string) => void
}

export type Citation = { url: string; title: string }

export type StreamResult = {
  text: string
  usage: AIUsage
  citations: Citation[]
  finishReason: string | null
}

// Collects web sources the AI cited, skipping duplicates and non-web links.
export function citationCollector() {
  const citations = new Map<string, Citation>()
  return {
    add(url: string | undefined, title: string | undefined) {
      if (!url || !/^https?:\/\//.test(url) || citations.has(url)) return
      citations.set(url, { url, title: (title || new URL(url).hostname).slice(0, 200) })
    },
    list: () => [...citations.values()],
  }
}

// Reads a server-sent event stream, calling `onData` with each `data:` payload.
export async function readEventStream(body: ReadableStream, onData: (data: string) => void) {
  const reader = (body as ReadableStream<BufferSource>).pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ""
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    for (const raw of lines) {
      const line = raw.trim()
      // Skips blank lines, "event:" names and keep-alive comments.
      if (!line.startsWith("data:")) continue
      const data = line.slice(5).trim()
      if (data && data !== "[DONE]") onData(data)
    }
  }
}

// Parses JSON, tolerating a ```json fence around it.
export function parseJson<T>(text: string): T | null {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  try {
    return JSON.parse(trimmed) as T
  } catch {
    const start = trimmed.indexOf("{")
    const end = trimmed.lastIndexOf("}")
    if (start === -1 || end <= start) return null
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as T
    } catch {
      return null
    }
  }
}
