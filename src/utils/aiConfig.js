const ENV_DEFAULT_AI_CONFIG = {
  baseURL: import.meta.env.VITE_AI_BASE_URL?.trim() || '',
  model: import.meta.env.VITE_AI_MODEL?.trim() || '',
  apiKey: import.meta.env.VITE_AI_API_KEY?.trim() || '',
}

export const DEFAULT_AI_CONFIG = ENV_DEFAULT_AI_CONFIG

export const AI_CONFIG_STORAGE_KEY = 'flux_ai_config'
export const AI_CONFIG_UPDATED_EVENT = 'flux:ai-config-updated'

export function readAiConfig() {
  if (typeof window === 'undefined') return DEFAULT_AI_CONFIG

  try {
    const raw = window.localStorage.getItem(AI_CONFIG_STORAGE_KEY)
    if (!raw) return DEFAULT_AI_CONFIG

    const parsed = JSON.parse(raw)
    return {
      baseURL: typeof parsed?.baseURL === 'string' ? parsed.baseURL : DEFAULT_AI_CONFIG.baseURL,
      model: typeof parsed?.model === 'string' ? parsed.model : DEFAULT_AI_CONFIG.model,
      apiKey: typeof parsed?.apiKey === 'string' ? parsed.apiKey : DEFAULT_AI_CONFIG.apiKey,
    }
  } catch {
    return DEFAULT_AI_CONFIG
  }
}

export function saveAiConfig(config) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config))
  window.dispatchEvent(new CustomEvent(AI_CONFIG_UPDATED_EVENT, { detail: config }))
}

export function isAiConfigReady(config) {
  return Boolean(config?.baseURL?.trim() && config?.model?.trim() && config?.apiKey?.trim())
}

export function resolveChatCompletionsUrl(baseURL) {
  const resolvedBaseUrl = (baseURL || DEFAULT_AI_CONFIG.baseURL).trim().replace(/\/$/, '')
  if (!resolvedBaseUrl) {
    throw new Error('Missing AI base URL')
  }
  if (/\/chat\/completions$/i.test(resolvedBaseUrl)) {
    return resolvedBaseUrl
  }
  return `${resolvedBaseUrl}/chat/completions`
}

export function subscribeAiConfig(listener) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const notify = () => {
    listener(readAiConfig())
  }

  const handleStorage = (event) => {
    if (!event.key || event.key === AI_CONFIG_STORAGE_KEY) {
      notify()
    }
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(AI_CONFIG_UPDATED_EVENT, notify)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(AI_CONFIG_UPDATED_EVENT, notify)
  }
}
