import "server-only"

// Minimal OpenRouter client (https://openrouter.ai). The API key stays on the
// server and is never sent to the browser.

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

export const AI_MODELS = {
  // Small, fast and very cheap: reading job postings.
  fast: process.env.OPENROUTER_MODEL_FAST || "anthropic/claude-haiku-5.5",
  // Best writing quality: application kits.
  writer: process.env.OPENROUTER_MODEL_WRITER || "anthropic/claude-sonnet-5.5",
}

export function isAIConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY)
}

export class AIError extends Error {
  constructor(
    public kind: "not_configured" | "unavailable" | "bad_response",
    message: string
  ) {
    super(message)
  }
}

export type AIUsage = { promptTokens: number; completionTokens: number; cost?: number }

type JsonSchema = Record<string, unknown>

// Asks the model for a JSON answer that matches `schema`.
export async function generateJson<T>({
  model,
  system,
  prompt,
  schemaName,
  schema,
  maxTokens = 1024,
  timeoutMs = 45_000,
}: {
  model: string
  system: string
  prompt: string
  schemaName: string
  schema: JsonSchema
  maxTokens?: number
  timeoutMs?: number
}): Promise<{ data: T; usage: AIUsage }> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new AIError("not_configured", "OPENROUTER_API_KEY is not set")

  let response: Response
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        "x-title": "Job Copilot",
        ...(process.env.NEXT_PUBLIC_SITE_URL ? { "http-referer": process.env.NEXT_PUBLIC_SITE_URL } : {}),
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: schemaName, strict: true, schema },
        },
        usage: { include: true },
      }),
    })
  } catch (err) {
    throw new AIError("unavailable", `Couldn't reach OpenRouter: ${(err as Error).message}`)
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    // 401: bad key. 402: out of credit. 429: rate limited. 5xx: provider trouble.
    throw new AIError("unavailable", `OpenRouter returned ${response.status}: ${detail.slice(0, 300)}`)
  }

  const body = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[]
    usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number }
    error?: { message?: string }
  }
  if (body.error) throw new AIError("unavailable", `OpenRouter error: ${body.error.message}`)

  const content = body.choices?.[0]?.message?.content ?? ""
  const data = parseJson<T>(content)
  if (data === null) throw new AIError("bad_response", "The AI's answer wasn't valid JSON")

  return {
    data,
    usage: {
      promptTokens: body.usage?.prompt_tokens ?? 0,
      completionTokens: body.usage?.completion_tokens ?? 0,
      cost: body.usage?.cost,
    },
  }
}

// Parses JSON, tolerating a ```json fence around it.
function parseJson<T>(text: string): T | null {
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
