import {
  formatAutoTagErrorMessage,
  QUICK_CAPTURE_ENRICHMENT_KIND,
  isLegacyOfflineQuickCapture,
  shouldAutoEnrichQuickCapture,
} from '../src/features/feed/quickCaptureEnrichment.js'
import { BLOCK_SOURCE_LABELS } from '../src/utils/blocks.js'

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
  console.log('verify:quick-capture')

  assertEqual(
    isLegacyOfflineQuickCapture({
      dimensions: {
        source: [BLOCK_SOURCE_LABELS.quickCapture],
      },
    }),
    true,
    'should recognize legacy quick capture blocks that still need AI enrichment',
  )

  assertEqual(
    isLegacyOfflineQuickCapture({
      aiEnrichment: { status: 'completed' },
      dimensions: {
        source: [BLOCK_SOURCE_LABELS.quickCapture],
      },
    }),
    false,
    'should not treat blocks with explicit enrichment state as legacy quick captures',
  )

  assertEqual(
    isLegacyOfflineQuickCapture({
      dimensions: {
        source: [BLOCK_SOURCE_LABELS.quickCapture, BLOCK_SOURCE_LABELS.aiGenerated],
      },
    }),
    false,
    'should not re-enrich quick captures that are already marked as AI generated',
  )

  assertEqual(
    shouldAutoEnrichQuickCapture({
      aiEnrichment: {
        kind: QUICK_CAPTURE_ENRICHMENT_KIND,
        status: 'pending',
      },
    }),
    true,
    'should auto-enrich pending quick capture blocks',
  )

  assertEqual(
    shouldAutoEnrichQuickCapture({
      aiEnrichment: {
        kind: QUICK_CAPTURE_ENRICHMENT_KIND,
        status: 'processing',
      },
    }),
    true,
    'should resume quick capture blocks that were left in processing state',
  )

  assertEqual(
    shouldAutoEnrichQuickCapture({
      aiEnrichment: {
        kind: QUICK_CAPTURE_ENRICHMENT_KIND,
        status: 'completed',
      },
    }),
    false,
    'should ignore completed quick capture enrichment records',
  )

  const hints = {
    auth: 'Authentication failed.',
    path: 'Endpoint not found.',
    rateLimit: 'Rate limited.',
    timeout: 'Request timed out.',
  }

  assertEqual(
    formatAutoTagErrorMessage(new Error('HTTP 404'), hints),
    hints.path,
    'should surface endpoint guidance for 404 responses',
  )

  assertEqual(
    formatAutoTagErrorMessage(new Error('HTTP 401'), hints),
    hints.auth,
    'should surface auth guidance for 401 responses',
  )

  assertEqual(
    formatAutoTagErrorMessage(new Error('HTTP 429'), hints),
    hints.rateLimit,
    'should surface rate-limit guidance for 429 responses',
  )

  assertEqual(
    formatAutoTagErrorMessage(new Error('Request timed out after 45 seconds'), hints),
    hints.timeout,
    'should surface timeout guidance for slow enrichment requests',
  )

  assertEqual(
    formatAutoTagErrorMessage(new Error('socket hang up'), hints),
    'socket hang up',
    'should preserve unknown enrichment errors verbatim',
  )

  assert(
    QUICK_CAPTURE_ENRICHMENT_KIND === 'quick-capture-classification',
    'quick capture enrichment kind should stay stable for persisted records',
  )

  console.log('PASS verify:quick-capture')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`FAIL verify:quick-capture -> ${message}`)
  process.exitCode = 1
}
