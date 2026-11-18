import "server-only"

// OpenRouter client (https://openrouter.ai). Used when OPENROUTER_API_KEY is set
// and OPENAI_API_KEY isn't. The key stays on the server.

import {
  AIError,
  citationCollector,
  parseJson,
  readEventStream,
  type AIUsage,
  type GenerateJsonOptions,
  type StreamResult,
  type StreamTextOptions,
} from "./shared"

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

export const OPENROUTER_MODELS = {
  fast: process.env.OPENROUTER_MODEL_FAST || "anthropic/claude-haiku-5.5",
  writer: process.env.OPENROUTER_MODEL_WRITER || "anthropic/claude-sonnet-5.5",
}

function headers(key: string) {
  return {
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    "x-title": "Job Copilot",
    ...(process.env.NEXT_PUBLIC_SITE_URL ? { "http-referer": process.env.NEXT_PUBLIC_SITE_URL } : {}),
  }
}

function requireKey() {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new AIError("not_configured", "OPENROUTER_API_KEY is not set")
  return key
}

export async function generateJson<T>({
  model,
  system,
  prompt,
  schemaName,
  schema,
  maxTokens = 1024,
  timeoutMs = 45_000,
}: GenerateJsonOptions): Promise<{ data: T; usage: AIUsage }> {
  const key = requireKey()

  let response: Response
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs),
      headers: headers(key),
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

type StreamChunk = {
  choices?: {
    delta?: { content?: string | null; annotations?: Annotation[] }
    message?: { annotations?: Annotation[] }
    finish_reason?: string | null
  }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number }
  error?: { message?: string }
}
type Annotation = { type?: string; url_citation?: { url?: string; title?: string } }

export async function streamText({
  model,
  system,
  prompt,
  maxTokens = 1500,
  webSearch = false,
  timeoutMs = 110_000,
  onDelta,
}: StreamTextOptions): Promise<StreamResult> {
  const key = requireKey()

  let response: Response
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs),
      headers: headers(key),
      body: JSON.stringify({
        model,
        stream: true,
        max_tokens: maxTokens,
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        usage: { include: true },
        ...(webSearch ? { plugins: [{ id: "web", max_results: 5 }] } : {}),
      }),
    })
  } catch (err) {
    throw new AIError("unavailable", `Couldn't reach OpenRouter: ${(err as Error).message}`)
  }

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "")
    throw new AIError("unavailable", `OpenRouter returned ${response.status}: ${detail.slice(0, 300)}`)
  }

  let text = ""
  let finishReason: string | null = null
  const usage: AIUsage = { promptTokens: 0, completionTokens: 0 }
  const citations = citationCollector()
  const addCitations = (list?: Annotation[]) => {
    for (const a of list ?? []) {
      if (a?.type === "url_citation") citations.add(a.url_citation?.url, a.url_citation?.title)
    }
  }

  try {
    await readEventStream(response.body, (data) => {
      let chunk: StreamChunk
      try {
        chunk = JSON.parse(data)
      } catch {
        return
      }
      if (chunk.error) throw new AIError("unavailable", `OpenRouter error: ${chunk.error.message}`)
      const choice = chunk.choices?.[0]
      const piece = choice?.delta?.content
      if (piece) {
        text += piece
        onDelta(piece)
      }
      addCitations(choice?.delta?.annotations)
      addCitations(choice?.message?.annotations)
      if (choice?.finish_reason) finishReason = choice.finish_reason
      if (chunk.usage) {
        usage.promptTokens = chunk.usage.prompt_tokens ?? usage.promptTokens
        usage.completionTokens = chunk.usage.completion_tokens ?? usage.completionTokens
        usage.cost = chunk.usage.cost ?? usage.cost
      }
    })
  } catch (err) {
    if (err instanceof AIError) throw err
    throw new AIError("unavailable", `The AI stream broke off: ${(err as Error).message}`)
  }

  if (finishReason === "error") throw new AIError("unavailable", "The AI stopped with an error")
  if (!text.trim()) throw new AIError("bad_response", "The AI returned nothing")
  return { text, usage, citations: citations.list(), finishReason }
}
