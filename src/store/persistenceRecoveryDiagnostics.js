export const PERSISTENCE_RECOVERY_DIAGNOSTIC_STORAGE_KEY = 'conflux_persistence_recovery_diagnostic'
export const PERSISTENCE_RECOVERY_DIAGNOSTIC_EVENT = 'conflux:persistence-recovery-diagnostic'

function getBrowserStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage ?? null
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function readLatestPersistenceRecoveryDiagnosticFromStorage(storage) {
  if (!storage?.getItem) {
    return null
  }

  try {
    const raw = storage.getItem(PERSISTENCE_RECOVERY_DIAGNOSTIC_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    const timestamp = normalizeString(parsed?.timestamp)
    const source = normalizeString(parsed?.source)
    const name = normalizeString(parsed?.name)
    const fallbackTarget = normalizeString(parsed?.fallbackTarget)
    const backupKey = normalizeString(parsed?.backupKey)
    const rawError = normalizeString(parsed?.rawError || parsed?.reason)

    if (!timestamp || !source || !name) {
      return null
    }

    return {
      backupKey,
      fallbackTarget,
      name,
      rawError,
      reason: rawError,
      source,
      timestamp,
    }
  } catch {
    return null
  }
}

export function readLatestPersistenceRecoveryDiagnostic() {
  return readLatestPersistenceRecoveryDiagnosticFromStorage(getBrowserStorage())
}

export function recordPersistenceRecoveryDiagnostic(
  {
    backupKey = '',
    fallbackTarget = '',
    name = '',
    rawError = '',
    reason = '',
    source = '',
    timestamp = new Date().toISOString(),
  } = {},
  storage = getBrowserStorage(),
) {
  if (!storage?.setItem) return null

  const normalizedRawError = normalizeString(rawError || reason)
  const payload = {
    backupKey: normalizeString(backupKey),
    fallbackTarget: normalizeString(fallbackTarget),
    name: normalizeString(name),
    rawError: normalizedRawError,
    reason: normalizedRawError,
    source: normalizeString(source),
    timestamp: normalizeString(timestamp) || new Date().toISOString(),
  }

  if (!payload.source || !payload.name) {
    return null
  }

  try {
    storage.setItem(PERSISTENCE_RECOVERY_DIAGNOSTIC_STORAGE_KEY, JSON.stringify(payload))

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PERSISTENCE_RECOVERY_DIAGNOSTIC_EVENT, { detail: payload }))
    }
  } catch {
    return null
  }

  return payload
}

export function clearPersistenceRecoveryDiagnostic(storage = getBrowserStorage()) {
  if (!storage?.removeItem) return false

  try {
    storage.removeItem(PERSISTENCE_RECOVERY_DIAGNOSTIC_STORAGE_KEY)

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PERSISTENCE_RECOVERY_DIAGNOSTIC_EVENT, { detail: null }))
    }
    return true
  } catch {
    return false
  }
}
