import "server-only"

// OpenAI client using the Responses API (https://platform.openai.com).
// Used whenever OPENAI_API_KEY is set. The key stays on the server.

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

const ENDPOINT = "https://api.openai.com/v1/responses"

export const OPENAI_MODELS = {
  // OpenAI's cheapest model: reading job postings.
  fast: process.env.OPENAI_MODEL_FAST || "gpt-6-luna",
  // OpenAI's everyday all-rounder: writing application kits.
  writer: process.env.OPENAI_MODEL_WRITER || "gpt-6.2-sol",
}

// These models think before answering, and that thinking counts towards the
// output limit, so each request gets this many extra tokens on top.
const THINKING_ALLOWANCE = 3000

// OpenAI doesn't say what each answer cost, so it's estimated from the price
// list (US dollars per million tokens). Models not listed are recorded as $0.
const PRICES: Record<string, { input: number; output: number }> = {
  "gpt-6.2-astra": { input: 8, output: 40 },
  "gpt-6.2-sol": { input: 2, output: 10 },
  "gpt-6.1-sol": { input: 2, output: 10 },
  "gpt-6.1-terra": { input: 1, output: 5 },
  "gpt-6-sol": { input: 2, output: 10 },
  "gpt-6-luna": { input: 0.1, output: 0.5 },
  "gpt-5.6-terra": { input: 2, output: 12 },
  "gpt-5.6-luna": { input: 0.2, output: 1.2 },
}
const PRICE_PER_WEB_SEARCH = 0.01 // $10 per 1,000 searches

function estimateCost(model: string, usage: AIUsage, searches: number) {
  const price = PRICES[model]
  if (!price) return undefined
  return (
    (usage.promptTokens * price.input + usage.completionTokens * price.output) / 1_000_000 +
    searches * PRICE_PER_WEB_SEARCH
  )
}

function requireKey() {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new AIError("not_configured", "OPENAI_API_KEY is not set")
  return key
}

async function post(key: string, body: Record<string, unknown>, timeoutMs: number) {
  let response: Response
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ store: false, reasoning: { effort: "low" }, ...body }),
    })
  } catch (err) {
    throw new AIError("unavailable", `Couldn't reach OpenAI: ${(err as Error).message}`)
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    // 401: bad key. 429: out of credit or rate limited. 5xx: OpenAI trouble.
    throw new AIError("unavailable", `OpenAI returned ${response.status}: ${detail.slice(0, 300)}`)
  }
  return response
}

type OutputContent = {
  type?: string
  text?: string
  refusal?: string
  annotations?: { type?: string; url?: string; title?: string }[]
}
type OutputItem = { type?: string; content?: OutputContent[] }
type ResponseBody = {
  status?: string
  error?: { message?: string } | null
  incomplete_details?: { reason?: string } | null
  output?: OutputItem[]
  usage?: { input_tokens?: number; output_tokens?: number }
}

function toUsage(body: ResponseBody | undefined): AIUsage {
  return {
    promptTokens: body?.usage?.input_tokens ?? 0,
    completionTokens: body?.usage?.output_tokens ?? 0,
  }
}

function countSearches(body: ResponseBody | undefined) {
  return (body?.output ?? []).filter((item) => item.type === "web_search_call").length
}

function messageParts(body: ResponseBody | undefined) {
  return (body?.output ?? []).filter((item) => item.type === "message").flatMap((item) => item.content ?? [])
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
  const response = await post(
    key,
    {
      model,
      instructions: system,
      input: prompt,
      max_output_tokens: maxTokens + THINKING_ALLOWANCE,
      text: { format: { type: "json_schema", name: schemaName, strict: true, schema } },
    },
    timeoutMs
  )

  const body = (await response.json()) as ResponseBody
  if (body.error?.message) throw new AIError("unavailable", `OpenAI error: ${body.error.message}`)
  if (body.status === "incomplete") {
    throw new AIError("bad_response", `The AI's answer was cut short (${body.incomplete_details?.reason ?? "unknown"})`)
  }

  const parts = messageParts(body)
  if (parts.some((p) => p.type === "refusal")) throw new AIError("bad_response", "The AI declined to answer")
  const content = parts.map((p) => (p.type === "output_text" ? p.text ?? "" : "")).join("")
  const data = parseJson<T>(content)
  if (data === null) throw new AIError("bad_response", "The AI's answer wasn't valid JSON")

  const usage = toUsage(body)
  return { data, usage: { ...usage, cost: estimateCost(model, usage, 0) } }
}

type StreamEvent = {
  type?: string
  delta?: string
  message?: string
  annotation?: { type?: string; url?: string; title?: string }
  response?: ResponseBody
  error?: { message?: string }
}

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
  const response = await post(
    key,
    {
      model,
      instructions: system,
      input: prompt,
      stream: true,
      max_output_tokens: maxTokens + THINKING_ALLOWANCE,
      ...(webSearch ? { tools: [{ type: "web_search" }] } : {}),
    },
    timeoutMs
  )
  if (!response.body) throw new AIError("unavailable", "OpenAI sent an empty reply")

  let text = ""
  let finishReason: string | null = null
  let final: ResponseBody | undefined
  const citations = citationCollector()

  try {
    await readEventStream(response.body, (data) => {
      let event: StreamEvent
      try {
        event = JSON.parse(data)
      } catch {
        return
      }
      switch (event.type) {
        case "response.output_text.delta":
          if (event.delta) {
            text += event.delta
            onDelta(event.delta)
          }
          break
        case "response.output_text.annotation.added":
          if (event.annotation?.type === "url_citation") citations.add(event.annotation.url, event.annotation.title)
          break
        case "response.completed":
          final = event.response
          finishReason = "stop"
          break
        case "response.incomplete":
          final = event.response
          finishReason = event.response?.incomplete_details?.reason === "max_output_tokens" ? "length" : "incomplete"
          break
        case "response.failed":
          throw new AIError("unavailable", `OpenAI error: ${event.response?.error?.message ?? "the request failed"}`)
        case "error":
          throw new AIError("unavailable", `OpenAI error: ${event.message ?? event.error?.message ?? "unknown"}`)
      }
    })
  } catch (err) {
    if (err instanceof AIError) throw err
    throw new AIError("unavailable", `The AI stream broke off: ${(err as Error).message}`)
  }

  // Sources can also arrive only in the finished answer.
  for (const part of messageParts(final)) {
    for (const a of part.annotations ?? []) {
      if (a.type === "url_citation") citations.add(a.url, a.title)
    }
  }

  if (!text.trim()) throw new AIError("bad_response", "The AI returned nothing")
  const usage = toUsage(final)
  return {
    text,
    usage: { ...usage, cost: estimateCost(model, usage, countSearches(final)) },
    citations: citations.list(),
    finishReason,
  }
}
