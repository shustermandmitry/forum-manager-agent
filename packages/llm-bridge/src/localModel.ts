/**
 * @module llm-bridge/localModel
 *
 * Local-LLM client. Talks to mlx_lm.server (or any OpenAI-API-compatible
 * endpoint) over HTTP. Long-running server holds the loaded model + LoRA;
 * we just POST chat-completions.
 *
 * The endpoint is set via opts.baseUrl — works equally for localhost
 * (single-machine setup) or a LAN IP (split-host: agent on M1 Air,
 * model on M1 Pro).
 */

import {
  SocketDisconnectedError,
  SubprocessError,
  type ChatArgs,
  type ChatResult,
  type DraftArgs,
  type DraftResult,
  type LLMClient,
  type LocalModelOpts,
  type RankArgs,
  type RankResult,
  type VoiceArgs,
  type VoiceResult,
} from './types.ts'
import { parseRankOutput } from './parseRank.ts'

interface ResolvedOpts {
  baseUrl: string
  modelName: string
  maxTokens: number
  timeoutMs: number
  temperature: number
}

function resolveOpts(opts: LocalModelOpts): ResolvedOpts {
  return {
    baseUrl: opts.baseUrl.replace(/\/$/, ''),
    modelName: opts.modelName,
    maxTokens: opts.maxTokens ?? 1024,
    timeoutMs: opts.timeoutMs ?? 5 * 60 * 1000,
    temperature: opts.temperature ?? 0.7,
  }
}

/** Shape of a single message in an OpenAI-API chat request. */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Shape of a chat-completions response we care about. */
interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string }
  }>
}

/**
 * Post messages to /v1/chat/completions, return the assistant content.
 * Maps known failure shapes to typed errors:
 *  - Network failure (server unreachable, ECONNREFUSED) → SocketDisconnectedError
 *  - HTTP timeout → SubprocessError
 *  - Non-2xx response → SubprocessError(status, body)
 */
async function callChat(messages: ChatMessage[], opts: ResolvedOpts): Promise<string> {
  const url = `${opts.baseUrl}/v1/chat/completions`
  const body = JSON.stringify({
    model: opts.modelName,
    messages,
    max_tokens: opts.maxTokens,
    temperature: opts.temperature,
    stream: false,
  })

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal: AbortSignal.timeout(opts.timeoutMs),
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'name' in err) {
      const name = (err as { name?: string }).name
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new SubprocessError(`mlx_lm.server timed out after ${opts.timeoutMs}ms`)
      }
    }
    // ECONNREFUSED, getaddrinfo failures, etc. → server unreachable
    throw new SocketDisconnectedError(
      `Could not reach mlx_lm.server at ${opts.baseUrl}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new SubprocessError(
      `mlx_lm.server returned ${res.status}: ${text || res.statusText}`,
      res.status,
    )
  }

  const json = (await res.json()) as ChatCompletionResponse
  const content = json.choices?.[0]?.message?.content ?? ''
  return content.trim()
}

function buildRankMessages(args: RankArgs): ChatMessage[] {
  return [
    {
      role: 'system',
      content: `${args.focusPrompt}

You evaluate a forum thread for engagement value on a 1-10 scale.
Respond with ONLY a single line of JSON, no preamble:
{"score": N, "rationale": "one sentence"}`,
    },
    {
      role: 'user',
      content: `Thread:\n${args.threadContext}`,
    },
  ]
}

function buildDraftMessages(args: DraftArgs): ChatMessage[] {
  const voiceBlock =
    args.voiceSamples && args.voiceSamples.length > 0
      ? `\n\nMy voice — write like these examples:\n${args.voiceSamples
          .map((s, i) => `Example ${i + 1}: ${s}`)
          .join('\n')}`
      : ''

  const instructionsBlock = args.topicInstructions
    ? `\n\nTopic-specific instructions:\n${args.topicInstructions}`
    : ''

  return [
    {
      role: 'system',
      content: `${args.focusPrompt}${voiceBlock}${instructionsBlock}

Draft my reply to the forum thread the user provides. Output the reply text only — no preamble.`,
    },
    {
      role: 'user',
      content: args.threadContext,
    },
  ]
}

function buildVoiceMessages(args: VoiceArgs): ChatMessage[] {
  const samples = args.voiceSamples
    .map((s, i) => `Example ${i + 1}: ${s}`)
    .join('\n')

  const redLinesBlock =
    args.redLines && args.redLines.length > 0
      ? `\n\nDo NOT:\n${args.redLines.map((r) => `- ${r}`).join('\n')}`
      : ''

  return [
    {
      role: 'system',
      content: `Rewrite the user's draft to match this writing voice. Keep the meaning identical; change wording, rhythm, and word choice to match my voice.

My voice — write like these examples:
${samples}${redLinesBlock}

Output ONLY the rewritten text, no preamble.`,
    },
    {
      role: 'user',
      content: args.claudeRaw,
    },
  ]
}

function buildChatMessages(args: ChatArgs): ChatMessage[] {
  const systemMessage: ChatMessage = {
    role: 'system',
    content: args.systemPrompt ?? 'You are an assistant managing my forum engagement work.',
  }

  const historyMessages: ChatMessage[] = args.history.map((m) => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.text,
  }))

  return [systemMessage, ...historyMessages, { role: 'user', content: args.message }]
}

/**
 * Create a local-LLM-backed LLMClient (HTTP to mlx_lm.server or
 * any OpenAI-API-compatible endpoint).
 *
 * @param opts - baseUrl, model name, optional LoRA path (informational),
 *   max tokens, timeout, temperature
 * @returns an LLMClient that POSTs each call to /v1/chat/completions
 *
 * @behaviour
 * - rank/draft/voice/chat → POST /v1/chat/completions with method-specific messages.
 * - voice() is fully supported (in fact, local model is the canonical voice client).
 * - On server unreachable → SocketDisconnectedError.
 * - On HTTP timeout → SubprocessError.
 * - On non-2xx response → SubprocessError(message, status).
 * - Inference is slow (~5-15 tok/s on M1 32GB q4); no fast-fail timeout in v1
 *   (timeoutMs default 5min).
 */
export function createLocalModelClient(opts: LocalModelOpts): LLMClient {
  const resolved = resolveOpts(opts)

  return {
    rank: async (args: RankArgs): Promise<RankResult> => {
      const messages = buildRankMessages(args)
      const text = await callChat(messages, resolved)
      return parseRankOutput(text)
    },

    draft: async (args: DraftArgs): Promise<DraftResult> => {
      const messages = buildDraftMessages(args)
      const text = await callChat(messages, resolved)
      return { text, promptUsed: JSON.stringify(messages) }
    },

    voice: async (args: VoiceArgs): Promise<VoiceResult> => {
      const messages = buildVoiceMessages(args)
      const text = await callChat(messages, resolved)
      return { text }
    },

    chat: async (args: ChatArgs): Promise<ChatResult> => {
      const messages = buildChatMessages(args)
      const text = await callChat(messages, resolved)
      return { text }
    },
  }
}
