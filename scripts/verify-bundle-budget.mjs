import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST_DIR = 'dist'
const ASSETS_DIR = join(DIST_DIR, 'assets')
const KIB = 1024

const budgets = [
  {
    label: 'largest current JS chunk',
    match: (asset) => asset.name.endsWith('.js'),
    maxBytes: 600 * KIB,
    mode: 'all',
  },
  {
    label: 'EditorPage route chunk',
    match: (asset) => /^EditorPage-.*\.js$/.test(asset.name),
    maxBytes: 100 * KIB,
  },
  {
    label: 'EditorSurface lazy chunk',
    match: (asset) => /^EditorSurface-.*\.js$/.test(asset.name),
    maxBytes: 250 * KIB,
  },
  {
    label: 'embedder entry chunk',
    match: (asset) => /^embedder-.*\.js$/.test(asset.name),
    maxBytes: 10 * KIB,
  },
  {
    label: 'editor vendor chunk',
    match: (asset) => /^vendor-editor-.*\.js$/.test(asset.name),
    maxBytes: 450 * KIB,
  },
  {
    label: 'Transformers vendor chunk',
    match: (asset) => /^vendor-transformers-.*\.js$/.test(asset.name),
    maxBytes: 300 * KIB,
  },
  {
    label: 'ONNX runtime vendor chunk',
    match: (asset) => /^vendor-onnxruntime-.*\.js$/.test(asset.name),
    maxBytes: 600 * KIB,
  },
]

function formatKiB(bytes) {
  return `${(bytes / KIB).toFixed(1)} KiB`
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function readCurrentBuildAssets() {
  const indexPath = join(DIST_DIR, 'index.html')
  const indexMtime = statSync(indexPath).mtimeMs
  const cutoff = indexMtime - 15000

  return readdirSync(ASSETS_DIR)
    .map((name) => {
      const path = join(ASSETS_DIR, name)
      const stats = statSync(path)
      return {
        mtimeMs: stats.mtimeMs,
        name,
        size: stats.size,
      }
    })
    .filter((asset) => asset.mtimeMs >= cutoff)
}

function newestMatchingAsset(assets, match) {
  return assets
    .filter(match)
    .sort((left, right) => right.mtimeMs - left.mtimeMs)[0]
}

try {
  console.log('verify:bundle')

  const assets = readCurrentBuildAssets()
  assert(assets.length > 0, 'No current build assets found. Run npm run build first.')

  budgets.forEach((budget) => {
    if (budget.mode === 'all') {
      const offenders = assets
        .filter(budget.match)
        .filter((asset) => asset.size > budget.maxBytes)

      assert(
        offenders.length === 0,
        `${budget.label} exceeds ${formatKiB(budget.maxBytes)}: ${offenders
          .map((asset) => `${asset.name} (${formatKiB(asset.size)})`)
          .join(', ')}`,
      )

      console.log(`PASS ${budget.label} <= ${formatKiB(budget.maxBytes)}`)
      return
    }

    const asset = newestMatchingAsset(assets, budget.match)
    assert(asset, `${budget.label} was not emitted by the current build.`)
    assert(
      asset.size <= budget.maxBytes,
      `${budget.label} exceeds ${formatKiB(budget.maxBytes)}: ${asset.name} is ${formatKiB(asset.size)}`,
    )

    console.log(`PASS ${budget.label}: ${asset.name} (${formatKiB(asset.size)})`)
  })

  console.log('PASS verify:bundle')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`FAIL verify:bundle -> ${message}`)
  process.exitCode = 1
}
