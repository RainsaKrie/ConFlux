import {
  CORRUPT_STORAGE_BACKUP_PREFIX,
  buildCorruptedStorageBackupKey,
  buildCorruptedStorageBackupPayload,
  serializeCorruptedStorageValue,
  serializeStorePayload,
  validateSerializedStoragePayload,
} from '../src/store/persistenceRecovery.js'

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

  console.log('PASS verify:native-persistence')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`FAIL verify:native-persistence -> ${message}`)
  process.exitCode = 1
}
