import { getPoolMatchScore } from '../pools/utils'

const phantomStopWords = new Set([
  'ai',
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'you',
  'your',
  '的',
  '是',
  '我',
  '你',
  '他',
  '她',
  '它',
])

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function countCjkChars(value = '') {
  return [...value.matchAll(/[\u3400-\u9fff]/g)].length
}

function countLatinChars(value = '') {
  return [...value.matchAll(/[a-z]/gi)].length
}

export function isEligibleLexiconTerm(value = '') {
  const trimmed = value.trim()
  if (!trimmed) return false

  const normalized = trimmed.toLowerCase()
  if (phantomStopWords.has(normalized)) return false

  const cjkChars = countCjkChars(trimmed)
  const latinChars = countLatinChars(trimmed)

  if (cjkChars > 0 && cjkChars < 2) return false
  if (cjkChars === 0 && latinChars > 0 && latinChars < 3) return false

  return true
}

function parseUpdatedAt(value) {
  const timestamp = Date.parse(value ?? '')
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function reasonToLabel(reasonType) {
  if (reasonType === 'project') return '命中实体'
  if (reasonType === 'domain') return '命中领域'
  return '命中标题'
}

function isStandaloneLatinMatch(text, start, end) {
  const before = text[start - 1] ?? ''
  const after = text[end] ?? ''
  return !/[a-z0-9_]/i.test(before) && !/[a-z0-9_]/i.test(after)
}

function isValidTermMatch(text, start, end, term) {
  if (!/[a-z]/i.test(term)) return true
  return isStandaloneLatinMatch(text, start, end)
}

export function buildPhantomLexicon(blocks) {
  const terms = new Map()

  blocks.forEach((block) => {
    const candidates = [
      { reasonType: 'title', term: block.title?.trim() ?? '' },
      ...((block.dimensions?.project ?? []).map((term) => ({ reasonType: 'project', term }))),
      ...((block.dimensions?.domain ?? []).map((term) => ({ reasonType: 'domain', term }))),
    ]

    candidates.forEach(({ reasonType, term }) => {
      const normalizedTerm = term.trim()
      if (!isEligibleLexiconTerm(normalizedTerm)) return

      const normalizedKey = normalizedTerm.toLowerCase()
      const current = terms.get(normalizedKey)
      const nextEntry = {
        block,
        blockId: block.id,
        blockTitle: block.title,
        reasonLabel: reasonToLabel(reasonType),
        reasonType,
        term: normalizedTerm,
        updatedAt: block.updatedAt,
      }

      if (!current || parseUpdatedAt(nextEntry.updatedAt) >= parseUpdatedAt(current.updatedAt)) {
        terms.set(normalizedKey, nextEntry)
      }
    })
  })

  const entries = [...terms.values()].sort((left, right) => {
    if (right.term.length !== left.term.length) return right.term.length - left.term.length
    return left.term.localeCompare(right.term, 'zh-Hans-CN')
  })

  if (entries.length === 0) {
    return {
      entries: [],
      entryMap: new Map(),
      regex: null,
      signature: '',
    }
  }

  return {
    entries,
    entryMap: new Map(entries.map((entry) => [entry.term.toLowerCase(), entry])),
    regex: new RegExp(entries.map((entry) => escapeRegExp(entry.term)).join('|'), 'giu'),
    signature: entries.map((entry) => `${entry.blockId}:${entry.reasonType}:${entry.term}`).join('|'),
  }
}

export function findLexiconMatches({
  activePoolContext,
  currentDocumentKey,
  lexicon,
  paragraphAfter,
  paragraphStart,
  paragraphText,
  contextParagraph,
  cursorOffset,
}) {
  if (!lexicon?.regex) return []
  if (!contextParagraph.trim()) return []
  if (paragraphText.includes('@')) return []

  const cues = []
  const matchedRanges = new Set()
  lexicon.regex.lastIndex = 0

  for (const match of paragraphText.matchAll(lexicon.regex)) {
    const entry = lexicon.entryMap.get(match[0].toLowerCase())
    if (!entry) continue
    if (currentDocumentKey && currentDocumentKey !== 'new' && entry.blockId === currentDocumentKey) continue

    const start = match.index ?? -1
    const end = start + match[0].length
    if (start < 0 || !isValidTermMatch(paragraphText, start, end, entry.term)) continue

    const rangeKey = `${start}:${end}`
    if (matchedRanges.has(rangeKey)) continue
    matchedRanges.add(rangeKey)

    const distance = Math.abs(cursorOffset - end)
    cues.push({
      blockId: entry.blockId,
      blockTitle: entry.blockTitle,
      from: paragraphStart + start,
      to: paragraphStart + end,
      matchText: paragraphText.slice(start, end),
      paragraphAfter,
      contextParagraph,
      reasonLabel: entry.reasonLabel,
      reasonType: entry.reasonType,
      score: 1000 + entry.term.length * 12 - distance + getPoolMatchScore(entry.block, activePoolContext),
      term: entry.term,
    })
  }

  return cues.sort((left, right) => {
    if (left.from !== right.from) return left.from - right.from
    if (right.matchText.length !== left.matchText.length) return right.matchText.length - left.matchText.length
    return right.score - left.score
  })
}
