import { DEFAULT_AI_CONFIG, readAiConfig, resolveChatCompletionsUrl } from './aiConfig'

const FALLBACK_CLASSIFICATION = {
  title: '',
  domain: ['\u672a\u5206\u7c7b'],
  format: ['\u788e\u7247'],
  project: [],
}

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
  if (!resolved?.apiKey?.trim()) throw new Error('Missing API key')

  return {
    baseURL: resolved.baseURL || DEFAULT_AI_CONFIG.baseURL,
    model: resolved.model || DEFAULT_AI_CONFIG.model,
    apiKey: resolved.apiKey.trim(),
  }
}

export async function classifyQuickCapture(content, config) {
  try {
    const resolved = ensureAiConfig(config)
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
            content:
              '\u6211\u4f20\u7ed9\u4f60\u4e00\u6bb5\u7b14\u8bb0\u3002\u8bf7\u5e2e\u6211\u5b8c\u6210\u4e24\u4ef6\u4e8b\uff1a1. \u4e3a\u8fd9\u6bb5\u7b14\u8bb0\u8d77\u4e00\u4e2a\u6781\u7b80\u7684\u6807\u9898\uff0810\u4e2a\u5b57\u4ee5\u5185\uff0c\u4e0d\u8981\u4efb\u4f55\u6807\u70b9\u7b26\u53f7\uff09\u30022. \u63d0\u53d63\u4e2a\u7ef4\u5ea6\uff1adomain(\u9886\u57df,\u6700\u591a2\u4e2a)\u3001format(\u4f53\u88c1)\u3001project(\u9879\u76ee\u5b9e\u4f53\u540d,\u6ca1\u6709\u5219\u7559\u7a7a)\u3002\u6240\u6709\u8f93\u51fa\u5fc5\u987b\u4f7f\u7528\u3010\u7b80\u4f53\u4e2d\u6587\u3011\u3002\u5f3a\u5236\u8f93\u51fa\u5408\u6cd5JSON\uff1a{"title":"\u6982\u62ec\u6027\u77ed\u6807\u9898", "domain":[],"format":[],"project":[]}\u3002\u9664 JSON \u5916\u4e0d\u8981\u8f93\u51fa\u4efb\u4f55\u591a\u4f59\u5b57\u7b26\u3002',
          },
          {
            role: 'user',
            content: `\u8bf7\u4e3a\u8fd9\u6bb5\u77e5\u8bc6\u95ea\u5ff5\u6253\u6807\uff1a\n${content}`,
          },
        ],
      }),
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const payload = await response.json()
    const rawText = payload?.choices?.[0]?.message?.content ?? ''
    return safeParseClassification(rawText)
  } catch {
    return FALLBACK_CLASSIFICATION
  }
}
