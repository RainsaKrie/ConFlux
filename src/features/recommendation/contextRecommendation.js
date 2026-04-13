import Fuse from 'fuse.js'
import { getPoolMatchScore } from '../pools/utils.js'
import {
  calculateLexiconConfidence,
  calculateSemanticConfidence,
  RECOMMENDATION_POLICY,
  resolveFuseThreshold,
} from '../search/recommendationPolicy.js'

const STOP_WORDS = new Set([
  'ai',
  'and',
  'block',
  'deck',
  'feed',
  'flux',
  'for',
  'from',
  'graph',
  'idea',
  'note',
  'pool',
  'react',
  'that',
  'the',
  'this',
  'with',
  '一个',
  '一种',
  '一些',
  '以及',
  '他们',
  '任何',
  '内容',
  '信息',
  '关系',
  '关于',
  '其中',
  '可以',
  '因为',
  '如何',
  '如果',
  '就是',
  '已经',
  '当前',
  '我们',
  '用户',
  '知识',
  '系统',
  '自己',
  '这个',
  '这样',
  '那个',
])

function containsCjk(value = '') {
  return /[\u3400-\u9fff]/.test(value)
}

function normalizeSearchValue(value = '') {
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d'"]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isMeaningfulTerm(normalizedTerm = '') {
  if (!normalizedTerm) return false
  if (STOP_WORDS.has(normalizedTerm)) return false
  if (/^\d+$/.test(normalizedTerm)) return false

  const compact = normalizedTerm.replace(/\s+/g, '')
  if (!compact) return false

  if (containsCjk(compact)) {
    return compact.length >= 2
  }

  return compact.length >= 3
}

function dedupeTerms(terms = []) {
  const seen = new Set()

  return terms.filter((term) => {
    const normalized = normalizeSearchValue(term)
    if (!isMeaningfulTerm(normalized) || seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

function buildEntryTerms(block) {
  const dimensions = block?.dimensions ?? {}
  const rawTerms = dedupeTerms([
    block?.title ?? '',
    ...(dimensions.project ?? []),
    ...(dimensions.domain ?? []),
  ])

  return rawTerms
    .map((raw) => ({
      raw: raw.trim(),
      normalized: normalizeSearchValue(raw),
    }))
    .filter((term) => term.normalized)
    .sort((left, right) => right.normalized.length - left.normalized.length)
}

export function buildContextRecommendationEngine(blocks = [], activeBlockId = null) {
  const entries = blocks
    .filter((block) => block?.id && block.id !== activeBlockId)
    .map((block) => {
      const terms = buildEntryTerms(block)
      if (terms.length === 0) return null

      return {
        block,
        blockId: block.id,
        searchText: [block.title, ...terms.map((term) => term.raw)].filter(Boolean).join(' '),
        terms,
        title: block.title ?? '',
      }
    })
    .filter(Boolean)

  return {
    entries,
    fuse: new Fuse(entries, {
      ignoreLocation: true,
      includeScore: true,
      keys: [
        { name: 'searchText', weight: 0.85 },
        { name: 'title', weight: 0.15 },
      ],
      minMatchCharLength: 2,
      threshold: 0.24,
    }),
  }
}

function collectMatchedTerms(entry, normalizedParagraph) {
  const matched = []
  const seen = new Set()

  entry.terms.forEach((term) => {
    if (!normalizedParagraph.includes(term.normalized)) return
    if (seen.has(term.normalized)) return
    seen.add(term.normalized)
    matched.push(term)
  })

  return matched
}

function buildLexiconCandidates({ activePoolContext, engine, paragraph }) {
  if (!engine?.entries?.length) return []

  const normalizedParagraph = normalizeSearchValue(paragraph)
  if (!normalizedParagraph || normalizedParagraph.length < RECOMMENDATION_POLICY.minParagraphLength) return []

  return engine.entries
    .map((entry) => {
      const matchedTerms = collectMatchedTerms(entry, normalizedParagraph)
      if (matchedTerms.length < RECOMMENDATION_POLICY.minMatchedTerms) return null

      const fuseQuery = matchedTerms.map((term) => term.raw).join(' ')
      const fuseResult = engine.fuse
        .search(fuseQuery)
        .find((result) => result.item.blockId === entry.blockId)
      const fuseScore = fuseResult?.score ?? 1
      const fuseThreshold = resolveFuseThreshold(matchedTerms.length)

      if (fuseScore > fuseThreshold) return null

      const poolBonus = getPoolMatchScore(entry.block, activePoolContext)
      const confidence = calculateLexiconConfidence({
        matchedTermsCount: matchedTerms.length,
        fuseScore,
        poolBonus,
      })

      return {
        block: entry.block,
        blockId: entry.blockId,
        confidence,
        fuseScore,
        fuseThreshold,
        matchedTerms: matchedTerms.map((term) => term.raw),
        paragraph: paragraph.trim(),
        reason: 'entities',
        reasonDetails: {
          matchedTermsCount: matchedTerms.length,
          poolBonus,
          strategy: matchedTerms.length >= RECOMMENDATION_POLICY.relaxedFuseMatchedTerms ? 'relaxed' : 'strict',
        },
      }
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.confidence !== left.confidence) return right.confidence - left.confidence
      return left.fuseScore - right.fuseScore
    })
}

export function readCurrentParagraphText(editor) {
  const parentText = editor?.state?.selection?.$from?.parent?.textContent ?? ''
  return parentText.replace(/\s+/g, ' ').trim()
}

export function buildDrawerSummary(content = '') {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''

  const sentenceMatch = normalized.match(/^(.{1,120}?[。！？!?])/)
  if (sentenceMatch?.[1]) return sentenceMatch[1]
  if (normalized.length <= 120) return normalized
  return `${normalized.slice(0, 120)}...`
}

export function findContextRecommendation({ activePoolContext, engine, paragraph }) {
  const candidates = buildLexiconCandidates({ activePoolContext, engine, paragraph })
  return candidates[0] ?? null
}

export async function findHybridContextRecommendation({
  activeBlockId = null,
  activePoolContext,
  engine,
  paragraph,
  vectorCacheError = null,
  vectorCacheStatus = 'idle',
  vectorSnapshot = [],
}) {
  const normalizedParagraph = normalizeSearchValue(paragraph)
  if (!normalizedParagraph || normalizedParagraph.length < RECOMMENDATION_POLICY.minParagraphLength) return null

  const lexiconCandidates = buildLexiconCandidates({ activePoolContext, engine, paragraph })
  const lexiconTopHit = lexiconCandidates[0] ?? null

  if (!vectorSnapshot.length) {
    return lexiconTopHit
      ? {
          ...lexiconTopHit,
          fallbackReason:
            vectorCacheStatus === 'failed'
              ? 'cache-failed'
              : vectorCacheStatus === 'warming'
                ? 'cache-warming'
                : 'cache-idle',
          recommendationPath: 'lexicon-only',
          semanticScore: 0,
        }
      : null
  }

  try {
    const { performHybridSearch } = await import('../search/hybridSearch.js')
    const hybridResults = await performHybridSearch(paragraph, vectorSnapshot, lexiconCandidates, {
      limit: 2,
    })
    const topHit = hybridResults.find((result) => result.blockId !== activeBlockId) ?? null

    if (!topHit) {
      return lexiconTopHit
        ? {
            ...lexiconTopHit,
            fallbackReason: 'semantic-no-hit',
            recommendationPath: 'lexicon-only',
            semanticScore: 0,
          }
        : null
    }

    const matchingLexiconHit = lexiconCandidates.find((candidate) => candidate.blockId === topHit.blockId) ?? null

    return {
      block: topHit.block,
      blockId: topHit.blockId,
      confidence: topHit.lexiconScore || calculateSemanticConfidence(topHit.semanticScore),
      fuseScore: matchingLexiconHit?.fuseScore ?? 1,
      fuseThreshold: matchingLexiconHit?.fuseThreshold ?? resolveFuseThreshold(0),
      matchedTerms: topHit.matchedTerms ?? [],
      paragraph: paragraph.trim(),
      reason: topHit.reason,
      reasonDetails: matchingLexiconHit?.reasonDetails ?? {
        matchedTermsCount: 0,
        poolBonus: 0,
        strategy: 'semantic-only',
      },
      fallbackReason: null,
      recommendationPath: topHit.reason === 'semantic' || topHit.reason === 'both' ? 'hybrid' : 'lexicon-only',
      semanticScore: topHit.semanticScore ?? 0,
    }
  } catch {
    return lexiconTopHit
      ? {
          ...lexiconTopHit,
          fallbackReason: vectorCacheError ? 'semantic-exception' : 'semantic-unavailable',
          recommendationPath: 'lexicon-only',
          semanticScore: 0,
        }
      : null
  }
}
