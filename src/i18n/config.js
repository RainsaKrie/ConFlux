import en from './locales/en.json'
import zh from './locales/zh.json'

export const LANGUAGE_STORAGE_KEY = 'flux_language'
export const SUPPORTED_LANGUAGES = ['en', 'zh']
export const DEFAULT_LANGUAGE = 'zh'

export const locales = {
  en,
  zh,
}

export function normalizeLanguage(language = '') {
  if (!language) return DEFAULT_LANGUAGE

  const lowered = language.toLowerCase()
  if (lowered.startsWith('zh')) return 'zh'
  if (lowered.startsWith('en')) return 'en'
  return DEFAULT_LANGUAGE
}

export function readStoredLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? '')
}

export function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE
  return normalizeLanguage(navigator.language ?? navigator.languages?.[0] ?? '')
}

export function getInitialLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return stored ? normalizeLanguage(stored) : detectBrowserLanguage()
}
