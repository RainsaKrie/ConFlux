import {
  CORRUPT_STORAGE_BACKUP_PREFIX,
  buildCorruptedStorageBackupKey,
  buildCorruptedStorageBackupPayload,
  serializeCorruptedStorageValue,
  serializeStorePayload,
  validateSerializedStoragePayload,
} from '../src/store/persistenceRecovery.js'
import {
  PERSISTENCE_RECOVERY_DIAGNOSTIC_STORAGE_KEY,
  readLatestPersistenceRecoveryDiagnosticFromStorage,
} from '../src/store/persistenceRecoveryDiagnostics.js'
import { createHybridPersistBridge } from '../src/store/hybridPersistStorage.js'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertEqual(actual, expected, message) {
  const actualSerialized = JSON.stringify(actual)
  const expectedSerialized = JSON.stringify(expected)
  if (actualSerialized !== expectedSerialized) {
    throw new Error(`${message}\nexpected: ${expectedSerialized}\nreceived: ${actualSerialized}`)
  }
}

function createMemoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed))

  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null
    },
    setItem(key, value) {
      map.set(key, value)
    },
    removeItem(key) {
      map.delete(key)
    },
    dump() {
      return Object.fromEntries(map.entries())
    },
    keys() {
      return [...map.keys()]
    },
  }
}

class MockTauriStore {
  constructor({
    initialEntries = {},
    failOnGet = false,
    failOnSet = false,
    failOnDelete = false,
  } = {}) {
    this.map = new Map(Object.entries(initialEntries))
    this.failOnGet = failOnGet
    this.failOnSet = failOnSet
    this.failOnDelete = failOnDelete
    this.saveCallCount = 0
  }

  async get(key) {
    if (this.failOnGet) {
      throw new Error('Mocked get failure')
    }

    return this.map.has(key) ? this.map.get(key) : null
  }

  async set(key, value) {
    if (this.failOnSet) {
      throw new Error('Mocked set failure')
    }

    this.map.set(key, value)
  }

  async delete(key) {
    if (this.failOnDelete) {
      throw new Error('Mocked delete failure')
    }

    this.map.delete(key)
  }

  async save() {
    this.saveCallCount += 1
  }

  dump() {
    return Object.fromEntries(this.map.entries())
  }
}

try {
  console.log('verify:native-persistence')

  assertEqual(
    buildCorruptedStorageBackupKey({
      source: 'localStorage',
      name: 'flux_blocks_store',
      timestamp: 1700000000000,
    }),
    `${CORRUPT_STORAGE_BACKUP_PREFIX}:localStorage:flux_blocks_store:1700000000000`,
    'should build stable corrupt-backup key',
  )

  assertEqual(
    serializeCorruptedStorageValue({ state: { fluxBlocks: [] }, version: 3 }),
    '{"state":{"fluxBlocks":[]},"version":3}',
    'should serialize object payload for backup',
  )

  assertEqual(
    validateSerializedStoragePayload('{"state":{"fluxBlocks":[]},"version":3}'),
    {
      ok: true,
      error: null,
      value: '{"state":{"fluxBlocks":[]},"version":3}',
    },
    'should accept valid serialized storage payload',
  )

  const invalidResult = validateSerializedStoragePayload('{bad-json')
  assert(invalidResult.ok === false, 'should reject invalid serialized payload')
  assert(invalidResult.error instanceof Error, 'invalid serialized payload should expose an error')

  assertEqual(
    serializeStorePayload({ state: { savedPools: [{ id: 'pool-1' }] }, version: 3 }),
    '{"state":{"savedPools":[{"id":"pool-1"}]},"version":3}',
    'should serialize store payload for persistence',
  )

  const backupPayload = JSON.parse(
    buildCorruptedStorageBackupPayload({
      name: 'flux_blocks_store',
      source: 'tauri-store',
      rawValue: { state: { fluxBlocks: [{ id: 'block-1' }] } },
      error: new Error('Corrupted payload'),
      capturedAt: '2026-04-21T00:00:00.000Z',
    }),
  )
  assertEqual(
    backupPayload,
    {
      capturedAt: '2026-04-21T00:00:00.000Z',
      error: 'Corrupted payload',
      name: 'flux_blocks_store',
      source: 'tauri-store',
      value: '{"state":{"fluxBlocks":[{"id":"block-1"}]}}',
    },
    'should build stable corrupt backup payload body',
  )

  const legacyStorage = createMemoryStorage({
    flux_blocks_store: '{"state":{"fluxBlocks":[{"id":"legacy-1"}]},"version":3}',
  })
  const webBridge = createHybridPersistBridge({
    legacyStorage,
    now: () => 1700000000000,
    getCapturedAt: () => '2026-04-21T00:00:00.000Z',
    logger: { info() {}, warn() {}, error() {} },
  })
  assertEqual(
    await webBridge.storage.getItem('flux_blocks_store'),
    '{"state":{"fluxBlocks":[{"id":"legacy-1"}]},"version":3}',
    'should read valid legacy payload in web mode',
  )

  const corruptedLegacyStorage = createMemoryStorage({
    flux_blocks_store: '{bad-json',
  })
  const corruptedLegacyBridge = createHybridPersistBridge({
    legacyStorage: corruptedLegacyStorage,
    now: () => 1700000000001,
    getCapturedAt: () => '2026-04-21T00:00:01.000Z',
    logger: { info() {}, warn() {}, error() {} },
  })
  assertEqual(
    await corruptedLegacyBridge.storage.getItem('flux_blocks_store'),
    null,
    'should drop corrupted legacy payloads',
  )
  const corruptLegacyKey = corruptedLegacyStorage
    .keys()
    .find((key) => key.startsWith(`${CORRUPT_STORAGE_BACKUP_PREFIX}:localStorage:flux_blocks_store:`))
  assert(Boolean(corruptLegacyKey), 'should back up corrupted legacy payloads before removal')
  assertEqual(
    readLatestPersistenceRecoveryDiagnosticFromStorage(corruptedLegacyStorage),
    {
      backupKey: corruptLegacyKey,
      fallbackTarget: 'safe-defaults',
      name: 'flux_blocks_store',
      rawError: invalidResult.error.message,
      reason: invalidResult.error.message,
      source: 'localStorage',
      timestamp: '2026-04-21T00:00:01.000Z',
    },
    'should record a readable diagnostic when corrupted legacy storage is recovered',
  )

  const tauriStore = new MockTauriStore()
  const migrationLegacyStorage = createMemoryStorage({
    flux_blocks_store: '{"state":{"savedPools":[{"id":"pool-1"}]},"version":3}',
  })
  const tauriMigrationBridge = createHybridPersistBridge({
    isTauri: true,
    tauriStore,
    legacyStorage: migrationLegacyStorage,
    setTimeoutFn: (callback) => {
      queueMicrotask(callback)
      return 1
    },
    clearTimeoutFn() {},
    logger: { info() {}, warn() {}, error() {} },
  })
  assertEqual(
    await tauriMigrationBridge.storage.getItem('flux_blocks_store'),
    '{"state":{"savedPools":[{"id":"pool-1"}]},"version":3}',
    'should migrate legacy payload into tauri store when native entry is missing',
  )
  assertEqual(
    tauriStore.dump(),
    {
      flux_blocks_store: {
        state: {
          savedPools: [{ id: 'pool-1' }],
        },
        version: 3,
      },
    },
    'should write migrated payload into tauri store',
  )
  assert(tauriStore.saveCallCount === 1, 'should persist tauri store after legacy migration')

  const corruptedTauriStore = new MockTauriStore({
    initialEntries: {
      flux_blocks_store: { bad: 1n },
    },
  })
  const tauriFallbackLegacyStorage = createMemoryStorage({
    flux_blocks_store: '{"state":{"recentAiTasks":[{"id":"task-1"}]},"version":3}',
  })
  const corruptedTauriBridge = createHybridPersistBridge({
    isTauri: true,
    tauriStore: corruptedTauriStore,
    legacyStorage: tauriFallbackLegacyStorage,
    now: () => 1700000000002,
    getCapturedAt: () => '2026-04-21T00:00:02.000Z',
    logger: { info() {}, warn() {}, error() {} },
  })
  assertEqual(
    await corruptedTauriBridge.storage.getItem('flux_blocks_store'),
    '{"state":{"recentAiTasks":[{"id":"task-1"}]},"version":3}',
    'should fall back to legacy payload when tauri store entry is corrupted',
  )
  assertEqual(
    corruptedTauriStore.dump(),
    {},
    'should delete corrupted tauri entry after backup',
  )
  const corruptTauriBackupKey = tauriFallbackLegacyStorage
    .keys()
    .find((key) => key.startsWith(`${CORRUPT_STORAGE_BACKUP_PREFIX}:tauri-store:flux_blocks_store:`))
  assert(Boolean(corruptTauriBackupKey), 'should back up corrupted tauri payloads before deletion')
  assertEqual(
    readLatestPersistenceRecoveryDiagnosticFromStorage(tauriFallbackLegacyStorage),
    {
      backupKey: corruptTauriBackupKey,
      fallbackTarget: 'legacy-mirror',
      name: 'flux_blocks_store',
      rawError: 'Do not know how to serialize a BigInt',
      reason: 'Do not know how to serialize a BigInt',
      source: 'tauri-store',
      timestamp: '2026-04-21T00:00:02.000Z',
    },
    'should record a readable diagnostic when corrupted tauri storage falls back to the legacy mirror',
  )

  const writableTauriStore = new MockTauriStore()
  const writableLegacyStorage = createMemoryStorage()
  const writeBridge = createHybridPersistBridge({
    isTauri: true,
    tauriStore: writableTauriStore,
    legacyStorage: writableLegacyStorage,
    setTimeoutFn: (callback) => {
      queueMicrotask(callback)
      return 1
    },
    clearTimeoutFn() {},
    logger: { info() {}, warn() {}, error() {} },
  })
  await writeBridge.storage.setItem('flux_blocks_store', '{"state":{"fluxBlocks":[{"id":"block-1"}]},"version":3}')
  assertEqual(
    writableTauriStore.dump(),
    {
      flux_blocks_store: {
        state: {
          fluxBlocks: [{ id: 'block-1' }],
        },
        version: 3,
      },
    },
    'should write parsed payload into tauri store on setItem',
  )
  assertEqual(
    writableLegacyStorage.dump(),
    {
      flux_blocks_store: '{"state":{"fluxBlocks":[{"id":"block-1"}]},"version":3}',
    },
    'should keep legacy mirror in sync after native writes',
  )

  const failingWriteBridge = createHybridPersistBridge({
    isTauri: true,
    tauriStore: new MockTauriStore({ failOnSet: true }),
    legacyStorage: writableLegacyStorage,
    logger: { info() {}, warn() {}, error() {} },
  })
  await failingWriteBridge.storage.setItem(
    'flux_blocks_store',
    '{"state":{"fluxBlocks":[{"id":"block-fallback"}]},"version":3}',
  )
  assertEqual(
    writableLegacyStorage.getItem('flux_blocks_store'),
    '{"state":{"fluxBlocks":[{"id":"block-fallback"}]},"version":3}',
    'should fall back to legacy storage when tauri write fails',
  )

  const failingDeleteLegacyStorage = createMemoryStorage({
    flux_blocks_store: '{"state":{"fluxBlocks":[{"id":"block-2"}]},"version":3}',
  })
  const failingDeleteBridge = createHybridPersistBridge({
    isTauri: true,
    tauriStore: new MockTauriStore({ failOnDelete: true }),
    legacyStorage: failingDeleteLegacyStorage,
    logger: { info() {}, warn() {}, error() {} },
  })
  await failingDeleteBridge.storage.removeItem('flux_blocks_store')
  assertEqual(
    failingDeleteLegacyStorage.getItem('flux_blocks_store'),
    null,
    'should still remove legacy mirror when tauri delete fails',
  )

  console.log('PASS verify:native-persistence')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`FAIL verify:native-persistence -> ${message}`)
  process.exitCode = 1
}
