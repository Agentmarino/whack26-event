// The one place that talks to Claude. Claude never computes a number: it reads documents into the
// engine's input, rewords templates (checked), and turns free-text what-ifs into engine levers.
// Every call goes through the cache (data/ai-cache.json); DEMO_OFFLINE=true makes no network call.

import Anthropic from '@anthropic-ai/sdk'
import { config } from './config.ts'
import { cacheGet, cacheKey, cacheSet } from './cache.ts'

let client: Anthropic | null = null
const getClient = () => (client ??= new Anthropic({ maxRetries: 1, timeout: 20_000 }))

export type ClaudeCall = {
  /** What the call is for, part of the cache key: 'wording', 'whatif', 'goal', 'report', 'bank', 'letter'. */
  purpose: string
  system: string
  /** Text prompt, or full content blocks (documents, images). */
  content: string | Anthropic.ContentBlockParam[]
  maxTokens?: number
  /** Cache key input. Default: the system prompt plus content (must be session-free). */
  keyInput?: unknown
  timeoutMs?: number
}

export type ClaudeReply = { text: string; from: 'cache' | 'claude' } | null

/** Joins every `text` block and ignores `thinking` blocks. null when offline, no key, or the call fails. */
export async function askClaude(call: ClaudeCall): Promise<ClaudeReply> {
  const key = cacheKey(call.purpose, call.keyInput ?? [call.system, call.content])
  const hit = cacheGet(key)
  if (hit !== undefined) return { text: hit, from: 'cache' }
  if (config.offline || !config.hasKey) return null
  try {
    const res = await getClient().messages.create(
      {
        model: config.model,
        max_tokens: call.maxTokens ?? 1024,
        system: call.system,
        messages: [{ role: 'user', content: call.content }],
      },
      { timeout: call.timeoutMs ?? 20_000 },
    )
    if (res.stop_reason === 'refusal') {
      log(call.purpose, 'refusal')
      return null
    }
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim()
    if (!text) return null
    return { text, from: 'claude' }
  } catch (err) {
    if (err instanceof Anthropic.APIError) log(call.purpose, `API ${err.status ?? ''} ${err.message}`)
    else log(call.purpose, err instanceof Error ? err.message : String(err))
    return null
  }
}

/** Keep an output that passed its checks, so the demo can run offline next time. */
export const remember = (call: Pick<ClaudeCall, 'purpose' | 'system' | 'content' | 'keyInput'>, text: string) =>
  cacheSet(cacheKey(call.purpose, call.keyInput ?? [call.system, call.content]), call.purpose, text)

/** First JSON object or array in a reply (Claude sometimes wraps it in a code fence). */
export function jsonIn(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = (fenced?.[1] ?? text).trim()
  const start = body.search(/[[{]/)
  if (start < 0) return undefined
  const open = body[start]
  const close = open === '[' ? ']' : '}'
  const end = body.lastIndexOf(close)
  if (end <= start) return undefined
  try {
    return JSON.parse(body.slice(start, end + 1))
  } catch {
    return undefined
  }
}

export function log(purpose: string, message: string) {
  console.warn(`[claude:${purpose}] ${message}`)
}
