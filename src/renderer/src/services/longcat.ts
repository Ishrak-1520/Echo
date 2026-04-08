/**
 * Echo — LongCat API Service
 *
 * Uses LongCat-Flash-Omni-2603 (multimodal) when a screenshot is available,
 * falls back to LongCat-Flash-Chat for text-only queries.
 *
 * If the Omni model request fails, automatically retries with the text-only
 * model so the user always gets a response.
 *
 * API Docs: https://longcat.chat/platform/docs/APIDocs.html
 */

import type { Message } from '../types'

const BASE_URL = 'https://api.longcat.chat/openai/v1/chat/completions'
const VISION_MODEL = 'LongCat-Flash-Omni-2603'
const TEXT_MODEL = 'LongCat-Flash-Chat'

interface AskOptions {
  question: string
  screenshotBase64: string | null
  conversationHistory: Message[]
  apiKey: string
  language: 'en' | 'bn' | 'auto'
}

function buildSystemPrompt(language: string): string {
  const isbn = language === 'bn'
  return isbn
    ? `তুমি ইকো (Echo), একজন বুদ্ধিমান স্ক্রিন সহকারী যা ব্যবহারকারীর স্ক্রিন সরাসরি দেখতে পারে। তুমি বর্তমানে স্ক্রিনে যা দেখছ তা ব্যবহার করে ব্যবহারকারীর প্রশ্নের সঠিক এবং সহায়ক উত্তর দেবে। সংক্ষিপ্ত কিন্তু সম্পূর্ণ উত্তর দাও।`
    : `You are Echo (ইকো), an AI buddy that lives on the user's screen. You can see everything on their screen right next to their cursor. Analyze what you see on the screen to answer their instructions helpfully and accurately. Be concise but complete. Act like a friend who is really good at everything.`
}

// ── Text-only request (LongCat-Flash-Chat) ──────────────────────────────────
// Standard OpenAI format — all content is plain strings.

function buildTextBody(opts: AskOptions): Record<string, unknown> {
  const systemContent = buildSystemPrompt(opts.language)

  const historyMessages = opts.conversationHistory.map((msg) => ({
    role: msg.role,
    content: msg.content
  }))

  return {
    model: TEXT_MODEL,
    messages: [
      { role: 'system', content: systemContent },
      ...historyMessages,
      { role: 'user', content: opts.question }
    ],
    stream: false,
    max_tokens: 1024,
    temperature: 0.7
  }
}

// ── Omni / Vision request (LongCat-Flash-Omni-2603) ─────────────────────────
// System & user content must be arrays of content blocks.
// Matches the format from the official API docs examples exactly.

function buildOmniBody(opts: AskOptions): Record<string, unknown> {
  const systemContent = buildSystemPrompt(opts.language)

  // History: keep as plain strings (we don't re-send old screenshots)
  const historyMessages = opts.conversationHistory.map((msg) => ({
    role: msg.role,
    content: msg.content
  }))

  // Current user message with screenshot
  const currentContent: unknown[] = []

  if (opts.screenshotBase64) {
    currentContent.push({
      type: 'input_image',
      input_image: {
        type: 'base64',
        data: [opts.screenshotBase64] // API docs: data is an array for images
      }
    })
  }

  currentContent.push({
    type: 'text',
    text: opts.question
  })

  // Match the official API docs example format exactly
  return {
    model: VISION_MODEL,
    messages: [
      { role: 'system', content: [{ type: 'text', text: systemContent }] },
      ...historyMessages,
      { role: 'user', content: currentContent }
    ],
    // The LongCat Omni API rejects UUID strings (hyphens). 
    // It requires a purely numeric string for the session ID.
    sessionId: String(Date.now()) + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
    stream: false,
    output_modalities: ['text']
  }
}

// ── API call helper ──────────────────────────────────────────────────────────

async function callLongCatAPI(
  body: Record<string, unknown>,
  apiKey: string
): Promise<string> {
  console.log('[Echo] Sending request — model:', body.model)

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    let errMsg = `API error ${response.status}`
    try {
      const errBody = await response.json()
      console.error('[Echo] API error body:', JSON.stringify(errBody, null, 2))
      errMsg = errBody?.error?.message ?? errBody?.message ?? errMsg
    } catch {
      // Response body might not be JSON
      try {
        const text = await response.text()
        console.error('[Echo] API error text:', text)
        errMsg = text || errMsg
      } catch {
        /* ignore */
      }
    }
    throw new Error(errMsg)
  }

  const data = await response.json()
  console.log('[Echo] Response received, parsing...')

  // Parse response — standard OpenAI-compatible format
  const content = data?.choices?.[0]?.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    // Some models return content as array of blocks
    return content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')
  }

  throw new Error('Unexpected response format from LongCat API')
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function askLongCat(opts: AskOptions): Promise<string> {
  if (!opts.apiKey) {
    throw new Error(
      'No API key configured. Open Settings (⚙️) and add your LongCat API key.'
    )
  }

  const useVision = Boolean(opts.screenshotBase64)

  if (useVision) {
    // Try the Omni (vision) model first
    try {
      const omniBody = buildOmniBody(opts)
      return await callLongCatAPI(omniBody, opts.apiKey)
    } catch (omniErr) {
      console.warn(
        '[Echo] Omni model failed, falling back to text-only:',
        omniErr instanceof Error ? omniErr.message : omniErr
      )
      // Fall through to text-only
    }
  }

  // Text-only path (either no screenshot, or Omni model failed)
  const textBody = buildTextBody(opts)
  return await callLongCatAPI(textBody, opts.apiKey)
}
