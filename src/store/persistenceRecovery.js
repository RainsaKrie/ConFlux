export const CORRUPT_STORAGE_BACKUP_PREFIX = 'flux_corrupt_backup'

export function buildCorruptedStorageBackupKey({ source, name, timestamp = Date.now() }) {
  return `${CORRUPT_STORAGE_BACKUP_PREFIX}:${source}:${name}:${timestamp}`
}

export function serializeCorruptedStorageValue(rawValue) {
  try {
    return typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue)
  } catch {
    return String(rawValue ?? '')
  }
}

export function buildCorruptedStorageBackupPayload({
  name,
  source,
  rawValue,
  error,
  capturedAt = new Date().toISOString(),
}) {
  return JSON.stringify({
    capturedAt,
    error: error instanceof Error ? error.message : String(error ?? 'Unknown storage error'),
    name,
    source,
    value: serializeCorruptedStorageValue(rawValue),
  })
}

export function validateSerializedStoragePayload(rawValue) {
  if (!rawValue) {
    return {
      ok: false,
      error: new Error('Missing storage payload.'),
      value: null,
    }
  }

  try {
    JSON.parse(rawValue)
    return {
      ok: true,
      error: null,
      value: rawValue,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
      value: null,
    }
  }
}

export function serializeStorePayload(value) {
  const serializedValue = JSON.stringify(value)
  JSON.parse(serializedValue)
  return serializedValue
}
