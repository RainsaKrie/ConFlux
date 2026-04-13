let vectorSnapshot = []
let vectorSignature = ''
let vectorStatus = 'idle'
let vectorError = null
let inflightPromise = null
let vectorEntryCache = new Map()

function buildBlockSignature(block = {}) {
  return [
    block.id ?? '',
    block.updatedAt ?? '',
    block.title ?? '',
    typeof block.content === 'string' ? block.content.slice(0, 160) : '',
    typeof block.content === 'string' ? block.content.length : 0,
  ].join('::')
}

function buildSnapshotSignature(fluxBlocks = []) {
  return fluxBlocks
    .filter((block) => block?.id)
    .map(buildBlockSignature)
    .join('|')
}

export function getVectorCacheSnapshot() {
  return vectorSnapshot
}

export function getVectorCacheStatus() {
  return vectorStatus
}

export function getVectorCacheError() {
  return vectorError
}

async function buildIncrementalVectorSnapshot(fluxBlocks = [], options = {}) {
  const snippetLength = options.snippetLength
  const progressCallback = options.progressCallback ?? null
  const { resolveBlockText } = await import('./hybridSearch.js')
  const { getTextEmbedding } = await import('./embedder.js')
  const nextEntryCache = new Map()
  const nextSnapshot = []

  for (const block of fluxBlocks) {
    if (!block?.id) continue

    const signature = buildBlockSignature(block)
    const cached = vectorEntryCache.get(block.id)

    if (cached?.signature === signature && cached.entry) {
      const reusedEntry = {
        ...cached.entry,
        block,
        blockId: block.id,
        title: typeof block.title === 'string' ? block.title.trim() : '',
      }
      nextEntryCache.set(block.id, {
        signature,
        entry: reusedEntry,
      })
      nextSnapshot.push(reusedEntry)
      continue
    }

    const text = resolveBlockText(block, snippetLength)
    if (!text) continue

    const vector = await getTextEmbedding(text, progressCallback)
    if (!vector.length) continue

    const nextEntry = {
      block,
      blockId: block.id,
      text,
      title: typeof block.title === 'string' ? block.title.trim() : '',
      vector,
    }

    nextEntryCache.set(block.id, {
      signature,
      entry: nextEntry,
    })
    nextSnapshot.push(nextEntry)
  }

  vectorEntryCache = nextEntryCache
  return nextSnapshot
}

export async function warmVectorCache(fluxBlocks = [], options = {}) {
  const nextSignature = buildSnapshotSignature(fluxBlocks)
  if (!nextSignature) {
    vectorSnapshot = []
    vectorSignature = ''
    vectorStatus = 'idle'
    vectorError = null
    inflightPromise = null
    vectorEntryCache = new Map()
    return vectorSnapshot
  }

  if (vectorSignature === nextSignature && vectorSnapshot.length > 0) {
    return vectorSnapshot
  }

  if (inflightPromise && vectorSignature === nextSignature) {
    return inflightPromise
  }

  vectorStatus = 'warming'
  vectorError = null
  vectorSignature = nextSignature

  inflightPromise = buildIncrementalVectorSnapshot(fluxBlocks, options)
    .then((snapshot) => {
      vectorSnapshot = snapshot
      vectorStatus = 'ready'
      return vectorSnapshot
    })
    .catch((error) => {
      vectorSnapshot = []
      vectorStatus = 'failed'
      vectorError = error
      return []
    })
    .finally(() => {
      inflightPromise = null
    })

  return inflightPromise
}
