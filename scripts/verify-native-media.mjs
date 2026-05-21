import {
  collectActiveMediaReferenceHtmlList,
  extractActiveMediaFiles,
} from '../src/features/media/localMediaService.js'
import {
  collectNativeMediaRelativePaths,
  computeUnusedNativeMediaPaths,
} from '../src/features/media/mediaReference.js'
import {
  collectDirectoryNativeMediaRelativePaths,
  computeOrphanedNativeMediaPaths,
} from '../src/features/media/nativeMediaCleanup.js'
import {
  clearMediaMissingDiagnostic,
  readLatestMediaMissingDiagnosticFromStorage,
  recordMediaMissingDiagnostic,
} from '../src/features/media/mediaMissingDiagnostics.js'
import {
  buildMissingMediaLabel,
  describeAvailableAttachmentState,
  describeAvailableImageState,
  describeMissingAttachmentState,
  describeMissingImageState,
} from '../src/features/media/nativeMediaRecovery.js'

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
  }
}

const fixtures = {
  explicitImage: '<img data-media-origin="tauri-appdata" data-media-relative-path="media/media_1.png" src="asset://media_1.png" />',
  legacyImage: '<img src="http://localhost/assets/media_1700000000_abcd1234.png" />',
  savedEditorImage: '<img src="asset://conflux_img_1700000002_abcd1234.png" />',
  attachmentCard: '<attachment-card data-media-origin="tauri-appdata" data-media-file-name="media_1700000001_file.pdf"></attachment-card>',
  sharedAttachment: '<attachment-card data-media-relative-path="media/media_shared.pdf"></attachment-card>',
}

try {
  console.log('verify:native-media')

  assertEqual(
    collectNativeMediaRelativePaths(fixtures.explicitImage),
    ['media/media_1.png'],
    'should extract explicit image relative path',
  )

  assertEqual(
    collectNativeMediaRelativePaths(fixtures.legacyImage),
    ['media/media_1700000000_abcd1234.png'],
    'should infer legacy image path from src',
  )

  assertEqual(
    collectNativeMediaRelativePaths(fixtures.savedEditorImage),
    ['media/conflux_img_1700000002_abcd1234.png'],
    'should infer native editor image path from src',
  )

  assertEqual(
    collectNativeMediaRelativePaths(fixtures.attachmentCard),
    ['media/media_1700000001_file.pdf'],
    'should infer attachment path from data-media-file-name',
  )

  const combined = collectNativeMediaRelativePaths(
    `${fixtures.explicitImage}${fixtures.legacyImage}${fixtures.savedEditorImage}${fixtures.attachmentCard}`,
  )
  assert(
    combined.length === 4,
    'should de-duplicate and collect four unique media references',
  )

  assertEqual(
    computeUnusedNativeMediaPaths(
      `${fixtures.explicitImage}${fixtures.sharedAttachment}`,
      [fixtures.sharedAttachment],
    ),
    ['media/media_1.png'],
    'should keep shared attachment and only mark unique image as unused',
  )

  assertEqual(
    computeUnusedNativeMediaPaths(fixtures.sharedAttachment, [fixtures.sharedAttachment]),
    [],
    'should not mark still-referenced media as unused',
  )

  assertEqual(
    collectDirectoryNativeMediaRelativePaths([
      { name: 'media_kept.png' },
      { name: 'conflux_img_1700000002_abcd1234.png' },
      { name: 'notes.txt' },
      { name: '' },
      null,
    ]),
    ['media/media_kept.png', 'media/conflux_img_1700000002_abcd1234.png'],
    'should collect only valid native media files from directory scan',
  )

  assertEqual(
    computeOrphanedNativeMediaPaths(
      [
        { name: 'media_1.png' },
        { name: 'media_shared.pdf' },
        { name: 'conflux_img_1700000002_abcd1234.png' },
        { name: 'draft.md' },
      ],
      [`${fixtures.explicitImage}${fixtures.sharedAttachment}`],
    ),
    ['media/conflux_img_1700000002_abcd1234.png'],
    'should only mark unreferenced native media files as orphaned during startup scan',
  )

  assertEqual(
    describeMissingImageState({
      currentAlt: 'diagram',
      missingAltText: 'Local media is unavailable.',
      placeholderSrc: 'data:image/svg+xml,placeholder',
    }),
    {
      alt: 'diagram - Local media is unavailable.',
      mediaMissing: 'true',
      src: 'data:image/svg+xml,placeholder',
      title: 'Local media is unavailable.',
    },
    'should describe a non-destructive missing image fallback state',
  )

  assertEqual(
    buildMissingMediaLabel('', 'Local media is unavailable.'),
    'Local media is unavailable.',
    'should not prepend separators when the original media label is empty',
  )

  assertEqual(
    describeAvailableImageState('asset://media_1.png'),
    {
      removeAttributes: ['data-media-missing', 'title'],
      src: 'asset://media_1.png',
    },
    'should describe how recovered images clear missing state',
  )

  assertEqual(
    describeMissingAttachmentState({
      missingAttachmentText: 'This local file is unavailable.',
      unavailableAttachmentLabel: 'Unavailable',
    }),
    {
      mediaMissing: 'true',
      removeAttributes: ['data-media-href'],
      title: 'This local file is unavailable.',
      unavailableAttachmentLabel: 'Unavailable',
    },
    'should describe missing attachment fallback without deleting structural metadata',
  )

  assertEqual(
    describeAvailableAttachmentState('asset://media_1.pdf'),
    {
      href: 'asset://media_1.pdf',
      removeAttributes: ['data-media-missing', 'title'],
    },
    'should describe how recovered attachments clear missing state',
  )

  const activeMediaFiles = extractActiveMediaFiles([
    {
      content: '<p>current copy</p>',
      revisions: [
        {
          beforeContent: '<img src="asset://conflux_img_revision_before.png" />',
          afterContent: '<attachment-card data-media-relative-path="media/media_revision_after.pdf"></attachment-card>',
        },
      ],
    },
  ])

  assertEqual(
    Array.from(activeMediaFiles).sort(),
    ['conflux_img_revision_before.png', 'media_revision_after.pdf'],
    'should protect media referenced only by revision history from GC',
  )

  assertEqual(
    collectActiveMediaReferenceHtmlList([
      {
        content: fixtures.explicitImage,
        revisions: [{ beforeContent: fixtures.legacyImage, afterContent: fixtures.attachmentCard }],
      },
    ]),
    [fixtures.explicitImage, fixtures.legacyImage, fixtures.attachmentCard],
    'should include current content and both revision sides in active media reference list',
  )

  assertEqual(
    computeUnusedNativeMediaPaths(
      collectActiveMediaReferenceHtmlList([
        {
          content: fixtures.explicitImage,
          revisions: [{ beforeContent: fixtures.legacyImage, afterContent: fixtures.attachmentCard }],
        },
      ]).join(''),
      [],
    ).sort(),
    [
      'media/media_1.png',
      'media/media_1700000000_abcd1234.png',
      'media/media_1700000001_file.pdf',
    ].sort(),
    'should treat current content and revision-only media as removable when deleting an entire note',
  )

  assertEqual(
    computeUnusedNativeMediaPaths(
      collectActiveMediaReferenceHtmlList([
        {
          content: fixtures.explicitImage,
          revisions: [{ beforeContent: fixtures.legacyImage }],
        },
      ]).join(''),
      collectActiveMediaReferenceHtmlList([
        {
          content: '<p>still active elsewhere</p>',
          revisions: [{ afterContent: fixtures.legacyImage }],
        },
      ]),
    ),
    ['media/media_1.png'],
    'should keep media that is still referenced only by another note revision during delete cleanup',
  )

  assertEqual(
    computeOrphanedNativeMediaPaths(
      [
        { name: 'media_1700000000_abcd1234.png' },
        { name: 'media_orphan.png' },
      ],
      collectActiveMediaReferenceHtmlList([
        {
          content: '<p>current copy</p>',
          revisions: [{ beforeContent: fixtures.legacyImage }],
        },
      ]),
    ),
    ['media/media_orphan.png'],
    'should keep startup-scan media that is referenced only by revision history',
  )

  const diagnosticStorage = createMemoryStorage()
  recordMediaMissingDiagnostic(
    {
      detection: 'rehydrate',
      kind: 'image',
      relativePath: 'media/conflux_img_1700000002_abcd1234.png',
      timestamp: '2026-04-29T10:00:00.000Z',
    },
    diagnosticStorage,
  )
  assertEqual(
    readLatestMediaMissingDiagnosticFromStorage(diagnosticStorage),
    {
      detection: 'rehydrate',
      kind: 'image',
      rawError: '',
      reason: '',
      relativePath: 'media/conflux_img_1700000002_abcd1234.png',
      timestamp: '2026-04-29T10:00:00.000Z',
    },
    'should store readable missing-media diagnostics for settings runtime inspection',
  )
  assertEqual(
    clearMediaMissingDiagnostic(diagnosticStorage),
    true,
    'should clear missing-media diagnostics cleanly',
  )
  assertEqual(
    readLatestMediaMissingDiagnosticFromStorage(diagnosticStorage),
    null,
    'should remove missing-media diagnostic payloads after clearing',
  )

  console.log('PASS verify:native-media')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`FAIL verify:native-media -> ${message}`)
  process.exitCode = 1
}
