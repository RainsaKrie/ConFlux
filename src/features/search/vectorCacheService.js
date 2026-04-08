import { buildVectorSnapshot } from './hybridSearch.js'

let vectorSnapshot = []
let vectorSignature = ''
let vectorStatus = 'idle'
let vectorError = null
let inflightPromise = null

function buildBlockSignature(block = {}) {
  return [
    block.id ?? '',
    block.updatedAt ?? '',
    block.title ?? '',
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

export async function warmVectorCache(fluxBlocks = [], options = {}) {
  const nextSignature = buildSnapshotSignature(fluxBlocks)
  if (!nextSignature) {
    vectorSnapshot = []
    vectorSignature = ''
    vectorStatus = 'idle'
    vectorError = null
    inflightPromise = null
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

  inflightPromise = buildVectorSnapshot(fluxBlocks, options)
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
