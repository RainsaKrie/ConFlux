import { readAiConfig, resolveChatCompletionsUrl, isAiConfigReady } from './aiConfig'
import {
  buildClassificationSystemPrompt,
  buildClassificationUserPrompt,
} from '../ai/prompts'

const FALLBACK_CLASSIFICATION = {
  title: '',
  domain: ['\u672a\u5206\u7c7b'],
  format: ['\u788e\u7247'],
  project: [],
}
const QUICK_CAPTURE_TIMEOUT_MS = 45000

function extractJsonObject(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)
  if (fenced?.[1]) return fenced[1]

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1)
  }

  return text
}

function safeParseClassification(text) {
  try {
    const parsed = JSON.parse(extractJsonObject(text))
    return {
      title: typeof parsed?.title === 'string' ? parsed.title.trim() : FALLBACK_CLASSIFICATION.title,
      domain: Array.isArray(parsed?.domain) ? parsed.domain : FALLBACK_CLASSIFICATION.domain,
      format: Array.isArray(parsed?.format) ? parsed.format : FALLBACK_CLASSIFICATION.format,
      project: Array.isArray(parsed?.project) ? parsed.project : FALLBACK_CLASSIFICATION.project,
    }
  } catch {
    return FALLBACK_CLASSIFICATION
  }
}

function ensureAiConfig(config) {
  const resolved = config ?? readAiConfig()
  if (!isAiConfigReady(resolved)) throw new Error('Incomplete AI config')

  return {
    baseURL: resolved.baseURL.trim(),
    model: resolved.model.trim(),
    apiKey: resolved.apiKey.trim(),
  }
}

async function requestQuickCaptureClassification(content, config, language = 'zh') {
  const resolved = ensureAiConfig(config)
  const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timeoutId = abortController
    ? globalThis.setTimeout(() => abortController.abort(), QUICK_CAPTURE_TIMEOUT_MS)
    : null

  try {
    const response = await fetch(resolveChatCompletionsUrl(resolved.baseURL), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resolved.apiKey}`,
      },
      body: JSON.stringify({
        model: resolved.model,
        messages: [
          {
            role: 'system',
            content: buildClassificationSystemPrompt(language),
          },
          {
            role: 'user',
            content: buildClassificationUserPrompt(content, language),
          },
        ],
      }),
      signal: abortController?.signal,
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const payload = await response.json()
    const rawText = payload?.choices?.[0]?.message?.content ?? ''
    return safeParseClassification(rawText)
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(QUICK_CAPTURE_TIMEOUT_MS / 1000)} seconds`)
    }

    throw error
  } finally {
    if (timeoutId) {
      globalThis.clearTimeout(timeoutId)
    }
  }
}

export async function classifyQuickCapture(content, config, language = 'zh') {
  try {
    return await requestQuickCaptureClassification(content, config, language)
  } catch {
    return FALLBACK_CLASSIFICATION
  }
}

export async function classifyQuickCaptureStrict(content, config, language = 'zh') {
  return requestQuickCaptureClassification(content, config, language)
}
