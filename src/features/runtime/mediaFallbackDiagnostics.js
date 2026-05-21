export const MEDIA_FALLBACK_DIAGNOSTIC_STORAGE_KEY = 'conflux_media_fallback_diagnostic'
export const MEDIA_FALLBACK_DIAGNOSTIC_EVENT = 'conflux:media-fallback-diagnostic'

export function readLatestMediaFallbackDiagnostic() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(MEDIA_FALLBACK_DIAGNOSTIC_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    const timestamp = typeof parsed?.timestamp === 'string' ? parsed.timestamp : ''
    const rawError = typeof parsed?.rawError === 'string'
      ? parsed.rawError
      : typeof parsed?.reason === 'string'
        ? parsed.reason
        : ''
    const count = Number.isFinite(parsed?.count) ? parsed.count : 1

    if (!timestamp) return null

    return {
      count,
      rawError,
      reason: rawError,
      timestamp,
    }
  } catch {
    return null
  }
}

export function recordMediaFallbackDiagnostic({ count = 1, reason = '', rawError = '' } = {}) {
  if (typeof window === 'undefined') return null

  const normalizedRawError = typeof rawError === 'string' && rawError
    ? rawError
    : typeof reason === 'string'
      ? reason
      : ''

  const payload = {
    count: Number.isFinite(count) && count > 0 ? count : 1,
    rawError: normalizedRawError,
    reason: normalizedRawError,
    timestamp: new Date().toISOString(),
  }

  try {
    window.localStorage.setItem(MEDIA_FALLBACK_DIAGNOSTIC_STORAGE_KEY, JSON.stringify(payload))
    window.dispatchEvent(new CustomEvent(MEDIA_FALLBACK_DIAGNOSTIC_EVENT, { detail: payload }))
  } catch {
    return null
  }

  return payload
}

export function clearMediaFallbackDiagnostic() {
  if (typeof window === 'undefined') return false

  try {
    window.localStorage.removeItem(MEDIA_FALLBACK_DIAGNOSTIC_STORAGE_KEY)
    window.dispatchEvent(new CustomEvent(MEDIA_FALLBACK_DIAGNOSTIC_EVENT, { detail: null }))
    return true
  } catch {
    return false
  }
}

export function clearFallbackDiagnostic() {
  return clearMediaFallbackDiagnostic()
}
