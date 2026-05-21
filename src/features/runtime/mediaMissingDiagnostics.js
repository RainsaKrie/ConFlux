export const MEDIA_MISSING_DIAGNOSTIC_STORAGE_KEY = 'conflux_media_missing_diagnostic'
export const MEDIA_MISSING_DIAGNOSTIC_EVENT = 'conflux:media-missing-diagnostic'

function getBrowserStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage ?? null
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function readLatestMediaMissingDiagnosticFromStorage(storage) {
  if (!storage?.getItem) {
    return null
  }

  try {
    const raw = storage.getItem(MEDIA_MISSING_DIAGNOSTIC_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    const timestamp = normalizeString(parsed?.timestamp)
    const kind = normalizeString(parsed?.kind)
    const relativePath = normalizeString(parsed?.relativePath)
    const detection = normalizeString(parsed?.detection)
    const rawError = normalizeString(parsed?.rawError || parsed?.reason)

    if (!timestamp || !kind || !relativePath) {
      return null
    }

    return {
      detection,
      kind,
      rawError,
      reason: rawError,
      relativePath,
      timestamp,
    }
  } catch {
    return null
  }
}

export function readLatestMediaMissingDiagnostic() {
  return readLatestMediaMissingDiagnosticFromStorage(getBrowserStorage())
}

export function recordMediaMissingDiagnostic(
  {
    detection = '',
    kind = '',
    rawError = '',
    reason = '',
    relativePath = '',
    timestamp = new Date().toISOString(),
  } = {},
  storage = getBrowserStorage(),
) {
  if (!storage?.setItem) return null

  const payload = {
    detection: normalizeString(detection),
    kind: normalizeString(kind),
    rawError: normalizeString(rawError || reason),
    reason: normalizeString(rawError || reason),
    relativePath: normalizeString(relativePath),
    timestamp: normalizeString(timestamp) || new Date().toISOString(),
  }

  if (!payload.kind || !payload.relativePath) {
    return null
  }

  try {
    storage.setItem(MEDIA_MISSING_DIAGNOSTIC_STORAGE_KEY, JSON.stringify(payload))

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(MEDIA_MISSING_DIAGNOSTIC_EVENT, { detail: payload }))
    }
  } catch {
    return null
  }

  return payload
}

export function clearMediaMissingDiagnostic(storage = getBrowserStorage()) {
  if (!storage?.removeItem) return false

  try {
    storage.removeItem(MEDIA_MISSING_DIAGNOSTIC_STORAGE_KEY)

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(MEDIA_MISSING_DIAGNOSTIC_EVENT, { detail: null }))
    }

    return true
  } catch {
    return false
  }
}
