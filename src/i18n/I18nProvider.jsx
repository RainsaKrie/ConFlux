/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LANGUAGE, getInitialLanguage, LANGUAGE_STORAGE_KEY, locales, normalizeLanguage } from './config'

const I18nContext = createContext(null)

function readPath(source, path) {
  return path.split('.').reduce((current, segment) => current?.[segment], source)
}

function interpolate(template, values = {}) {
  return template.replace(/\{\{(.*?)\}\}/g, (_, key) => String(values[key.trim()] ?? ''))
}

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => getInitialLanguage())

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language
    }
  }, [language])

  const value = useMemo(() => {
    const setLanguage = (nextLanguage) => {
      setLanguageState(normalizeLanguage(nextLanguage))
    }

    const t = (path, values = {}) => {
      const dictionary = locales[language] ?? locales[DEFAULT_LANGUAGE]
      const fallbackDictionary = locales[DEFAULT_LANGUAGE]
      const resolved = readPath(dictionary, path) ?? readPath(fallbackDictionary, path) ?? path
      return typeof resolved === 'string' ? interpolate(resolved, values) : resolved
    }

    return {
      language,
      setLanguage,
      t,
    }
  }, [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider')
  }
  return context
}
