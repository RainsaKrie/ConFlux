import Fuse from 'fuse.js'
import { getPoolMatchScore } from '../pools/utils.js'

const MIN_PARAGRAPH_LENGTH = 8
const MIN_MATCHED_TERMS = 1
const MAX_FUSE_SCORE = 0.18
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
  if (!engine?.entries?.length) return null

  const normalizedParagraph = normalizeSearchValue(paragraph)
  if (!normalizedParagraph || normalizedParagraph.length < MIN_PARAGRAPH_LENGTH) return null

  const candidates = engine.entries
    .map((entry) => {
      const matchedTerms = collectMatchedTerms(entry, normalizedParagraph)
      if (matchedTerms.length < MIN_MATCHED_TERMS) return null

      const fuseQuery = matchedTerms.map((term) => term.raw).join(' ')
      const fuseResult = engine.fuse
        .search(fuseQuery)
        .find((result) => result.item.blockId === entry.blockId)
      const fuseScore = fuseResult?.score ?? 1

      if (fuseScore > MAX_FUSE_SCORE) return null

      const poolBonus = getPoolMatchScore(entry.block, activePoolContext)
      const confidence = matchedTerms.length * 140 + Math.round((1 - fuseScore) * 100) + poolBonus

      return {
        block: entry.block,
        confidence,
        fuseScore,
        matchedTerms: matchedTerms.map((term) => term.raw),
        paragraph: paragraph.trim(),
      }
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.confidence !== left.confidence) return right.confidence - left.confidence
      return left.fuseScore - right.fuseScore
    })

  return candidates[0] ?? null
}
