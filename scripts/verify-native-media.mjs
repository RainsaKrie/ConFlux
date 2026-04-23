import {
  collectNativeMediaRelativePaths,
  computeUnusedNativeMediaPaths,
} from '../src/features/media/mediaReference.js'

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

  console.log('PASS verify:native-media')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`FAIL verify:native-media -> ${message}`)
  process.exitCode = 1
}
