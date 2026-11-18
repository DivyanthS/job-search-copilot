import "server-only"

// The app's AI. Uses OpenAI when OPENAI_API_KEY is set, otherwise OpenRouter
// when OPENROUTER_API_KEY is set. Keys stay on the server.

import * as openai from "./openai"
import * as openrouter from "./openrouter"
import type { AIUsage, GenerateJsonOptions, StreamResult, StreamTextOptions } from "./shared"

export { AIError, type AIUsage, type StreamResult } from "./shared"

const useOpenAI = Boolean(process.env.OPENAI_API_KEY)

export const AI_MODELS = useOpenAI ? openai.OPENAI_MODELS : openrouter.OPENROUTER_MODELS

export function isAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY)
}

// Asks the model for a JSON answer that matches `schema`.
export function generateJson<T>(options: GenerateJsonOptions): Promise<{ data: T; usage: AIUsage }> {
  return useOpenAI ? openai.generateJson<T>(options) : openrouter.generateJson<T>(options)
}

// Streams a plain-text answer, calling `onDelta` as each piece arrives.
export function streamText(options: StreamTextOptions): Promise<StreamResult> {
  return useOpenAI ? openai.streamText(options) : openrouter.streamText(options)
}
