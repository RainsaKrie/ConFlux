import { contentToPlainText } from '../../utils/blocks.js'
import { cosineSimilarity, getTextEmbedding } from './embedder.js'

const DEFAULT_SNIPPET_LENGTH = 500
const DEFAULT_SEMANTIC_THRESHOLD = 0.38
const DEFAULT_LIMIT = 2
const BOTH_HIT_BONUS = 1000
const LEXICON_HIT_BONUS = 100

function normalizeArray(value) {
  return Array.isArray(value) ? value : []
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function resolveBlockText(block = {}, snippetLength = DEFAULT_SNIPPET_LENGTH) {
  const title = normalizeString(block.title)
  const body = contentToPlainText(block.content ?? '')
  const snippet = body.slice(0, snippetLength).trim()
  return [title, snippet].filter(Boolean).join('\n')
}

function normalizeLexiconHit(hit) {
  if (!hit) return null

  const block = hit.block ?? hit
  const blockId = hit.blockId ?? block?.id ?? null
  if (!blockId) return null

  return {
    block,
    blockId,
    confidence: typeof hit.confidence === 'number' ? hit.confidence : 0,
    matchedTerms: normalizeArray(hit.matchedTerms),
  }
}

function buildSemanticCandidates(queryVector, vectorSnapshot, threshold) {
  return vectorSnapshot
    .map((entry) => {
      const similarity = cosineSimilarity(queryVector, entry.vector)
      if (similarity <= threshold) return null

      return {
        block: entry.block,
        blockId: entry.blockId,
        similarity,
        title: entry.title,
      }
    })
    .filter(Boolean)
    .sort((left, right) => right.similarity - left.similarity)
}

export async function buildVectorSnapshot(fluxBlocks = [], options = {}) {
  const snippetLength = options.snippetLength ?? DEFAULT_SNIPPET_LENGTH
  const snapshot = []

  for (const block of fluxBlocks) {
    if (!block?.id) continue

    const text = resolveBlockText(block, snippetLength)
    if (!text) continue

    const vector = await getTextEmbedding(text, options.progressCallback ?? null)
    if (!vector.length) continue

    snapshot.push({
      block,
      blockId: block.id,
      text,
      title: normalizeString(block.title),
      vector,
    })
  }

  return snapshot
}

export async function performHybridSearch(
  queryText,
  vectorSnapshot = [],
  lexiconResults = [],
  options = {},
) {
  const normalizedQuery = normalizeString(queryText)
  if (!normalizedQuery || !vectorSnapshot.length) return []

  const semanticThreshold = options.semanticThreshold ?? DEFAULT_SEMANTIC_THRESHOLD
  const limit = options.limit ?? DEFAULT_LIMIT
  const queryVector = await getTextEmbedding(normalizedQuery, options.progressCallback ?? null)
  if (!queryVector.length) return []

  const semanticHits = buildSemanticCandidates(queryVector, vectorSnapshot, semanticThreshold)
  const lexiconHits = normalizeArray(lexiconResults)
    .map(normalizeLexiconHit)
    .filter(Boolean)

  const merged = new Map()

  semanticHits.forEach((hit) => {
    merged.set(hit.blockId, {
      block: hit.block,
      blockId: hit.blockId,
      reason: 'semantic',
      semanticScore: hit.similarity,
      lexiconScore: 0,
      matchedTerms: [],
      score: hit.similarity,
      title: hit.title,
    })
  })

  lexiconHits.forEach((hit) => {
    const current = merged.get(hit.blockId)
    if (current) {
      merged.set(hit.blockId, {
        ...current,
        lexiconScore: hit.confidence,
        matchedTerms: hit.matchedTerms,
        reason: 'both',
        score: BOTH_HIT_BONUS + current.semanticScore + hit.confidence,
      })
      return
    }

    merged.set(hit.blockId, {
      block: hit.block,
      blockId: hit.blockId,
      reason: 'entities',
      semanticScore: 0,
      lexiconScore: hit.confidence,
      matchedTerms: hit.matchedTerms,
      score: LEXICON_HIT_BONUS + hit.confidence,
      title: normalizeString(hit.block?.title),
    })
  })

  return [...merged.values()]
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      if (right.semanticScore !== left.semanticScore) return right.semanticScore - left.semanticScore
      return right.lexiconScore - left.lexiconScore
    })
    .slice(0, limit)
}

export {
  DEFAULT_LIMIT,
  DEFAULT_SEMANTIC_THRESHOLD,
  DEFAULT_SNIPPET_LENGTH,
  resolveBlockText,
}
