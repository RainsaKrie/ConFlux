import {
  buildCorruptedStorageBackupKey,
  buildCorruptedStorageBackupPayload,
  serializeStorePayload,
  validateSerializedStoragePayload,
} from './persistenceRecovery.js'
import { recordPersistenceRecoveryDiagnostic } from './persistenceRecoveryDiagnostics.js'

const DEFAULT_STORE_SAVE_DEBOUNCE_MS = 800

function createNoopStorage() {
  return {
    getItem() {
      return null
    },
    setItem() {},
    removeItem() {},
  }
}

export function createHybridPersistBridge({
  isTauri = false,
  tauriStore = null,
  legacyStorage = createNoopStorage(),
  now = () => Date.now(),
  getCapturedAt = () => new Date().toISOString(),
  debounceMs = DEFAULT_STORE_SAVE_DEBOUNCE_MS,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  logger = console,
} = {}) {
  let pendingStoreSaveTimer = null
  let pendingStoreSavePromise = null
  let pendingStoreSaveResolve = null

  function readLegacyStorage(key) {
    return legacyStorage?.getItem?.(key) ?? null
  }

  function writeLegacyStorage(key, value) {
    legacyStorage?.setItem?.(key, value)
  }

  function removeLegacyStorage(key) {
    legacyStorage?.removeItem?.(key)
  }

  function backupCorruptedStorageEntry(name, source, rawValue, error, fallbackTarget = '') {
    const backupKey = buildCorruptedStorageBackupKey({
      source,
      name,
      timestamp: now(),
    })
    const backupPayload = buildCorruptedStorageBackupPayload({
      capturedAt: getCapturedAt(),
      error,
      name,
      rawValue,
      source,
    })

    writeLegacyStorage(backupKey, backupPayload)
    recordPersistenceRecoveryDiagnostic(
      {
        backupKey,
        fallbackTarget,
        name,
        rawError: error instanceof Error ? error.message : String(error ?? ''),
        source,
        timestamp: getCapturedAt(),
      },
      legacyStorage,
    )
  }

  function readValidatedLegacyStorage(name) {
    const rawValue = readLegacyStorage(name)
    if (!rawValue) return null

    const validation = validateSerializedStoragePayload(rawValue)
    if (validation.ok) {
      return validation.value
    }

    logger.warn?.('Legacy localStorage payload is invalid, resetting to defaults.', validation.error)
    backupCorruptedStorageEntry(name, 'localStorage', rawValue, validation.error, 'safe-defaults')
    removeLegacyStorage(name)
    return null
  }

  async function removeCorruptedTauriStoreEntry(name, rawValue, error) {
    logger.warn?.('Tauri Store payload is invalid, resetting to defaults.', error)
    backupCorruptedStorageEntry(name, 'tauri-store', rawValue, error, 'legacy-mirror')

    if (!tauriStore) return

    await tauriStore.delete(name)
    await tauriStore.save()
  }

  async function runScheduledStoreSave() {
    try {
      await tauriStore?.save()
    } finally {
      pendingStoreSaveTimer = null
      pendingStoreSavePromise = null
      if (pendingStoreSaveResolve) {
        pendingStoreSaveResolve()
        pendingStoreSaveResolve = null
      }
    }
  }

  async function scheduleStoreSave() {
    if (!tauriStore) return
    if (pendingStoreSavePromise) return pendingStoreSavePromise

    pendingStoreSavePromise = new Promise((resolve) => {
      pendingStoreSaveResolve = resolve
    })

    if (pendingStoreSaveTimer) {
      clearTimeoutFn(pendingStoreSaveTimer)
    }

    pendingStoreSaveTimer = setTimeoutFn(() => {
      void runScheduledStoreSave()
    }, debounceMs)

    return pendingStoreSavePromise
  }

  async function flushPersistedStoreWrites() {
    if (!tauriStore) return

    if (pendingStoreSaveTimer) {
      clearTimeoutFn(pendingStoreSaveTimer)
      await runScheduledStoreSave()
      return
    }

    if (pendingStoreSavePromise) {
      await pendingStoreSavePromise
    }
  }

  const storage = {
    getItem: async (name) => {
      if (!isTauri || !tauriStore) return readValidatedLegacyStorage(name)

      try {
        const value = await tauriStore.get(name)

        if (value !== null && typeof value !== 'undefined') {
          try {
            return serializeStorePayload(value)
          } catch (error) {
            await removeCorruptedTauriStoreEntry(name, value, error)
            return readValidatedLegacyStorage(name)
          }
        }

        const legacyData = readValidatedLegacyStorage(name)
        if (legacyData) {
          logger.info?.('Detected legacy storage, migrating to Tauri Store.')
          const parsed = JSON.parse(legacyData)
          await tauriStore.set(name, parsed)
          await tauriStore.save()
          return JSON.stringify(parsed)
        }

        return null
      } catch (error) {
        logger.error?.('Tauri Store read failed, falling back to localStorage.', error)
        return readValidatedLegacyStorage(name)
      }
    },
    setItem: async (name, value) => {
      if (!isTauri || !tauriStore) {
        writeLegacyStorage(name, value)
        return
      }

      try {
        const parsedValue = JSON.parse(value)
        await tauriStore.set(name, parsedValue)
        await scheduleStoreSave()
        writeLegacyStorage(name, value)
      } catch (error) {
        logger.warn?.('Tauri Store write failed, falling back to localStorage.', error)
        writeLegacyStorage(name, value)
      }
    },
    removeItem: async (name) => {
      if (!isTauri || !tauriStore) {
        removeLegacyStorage(name)
        return
      }

      try {
        await tauriStore.delete(name)
        await tauriStore.save()
        removeLegacyStorage(name)
      } catch (error) {
        logger.warn?.('Tauri Store delete failed, falling back to localStorage.', error)
        removeLegacyStorage(name)
      }
    },
  }

  return {
    storage,
    flushPersistedStoreWrites,
  }
}
