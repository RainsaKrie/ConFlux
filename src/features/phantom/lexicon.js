import { contentToPlainText, extractAdaptiveLensSummaries } from '../../utils/blocks'
import { getPoolMatchScore } from '../pools/utils'

const phantomStopWords = new Set([
  'a',
  'about',
  'ai',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'because',
  'by',
  'for',
  'from',
  'how',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'so',
  'that',
  'the',
  'their',
  'there',
  'these',
  'this',
  'those',
  'to',
  'use',
  'via',
  'we',
  'with',
  'you',
  'your',
  '一种',
  '一个',
  '一些',
  '一段',
  '一种',
  '以及',
  '但是',
  '关于',
  '其中',
  '如果',
  '如何',
  '因为',
  '所以',
  '可以',
  '我们',
  '你们',
  '他们',
  '她们',
  '它们',
  '这个',
  '那个',
  '这些',
  '那些',
  '什么',
  '不是',
  '没有',
  '需要',
  '当前',
  '相关',
  '内容',
  '问题',
  '说明',
  '一个',
  '一种',
  '进行',
  '以及',
  '之间',
  '由于',
  '为了',
  '通过',
  '关于',
  '因为',
  '所以',
  '就是',
  '然后',
  '已经',
  '还有',
  '这里',
  '那里',
  '自己',
  '目前',
  '我们',
  '你',
  '我',
  '他',
  '她',
  '它',
  '的',
  '了',
  '和',
  '与',
  '及',
  '是',
  '在',
  '中',
  '把',
  '被',
  '对',
  '将',
  '并',
  '并且',
  '或',
  '而',
  '而且',
  '呢',
  '啊',
  '吗',
  '呀',
])

const reasonPriority = {
  title: 1,
  project: 2,
  domain: 2,
  summary: 3,
  snippet: 4,
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function countCjkChars(value = '') {
  return [...value.matchAll(/[\u3400-\u9fff]/g)].length
}

function countLatinChars(value = '') {
  return [...value.matchAll(/[a-z]/gi)].length
}

function normalizeTerm(value = '') {
  return value.replace(/\s+/g, ' ').trim()
}

function dedupeTerms(terms = [], limit = Infinity) {
  const seen = new Set()
  const output = []

  terms.forEach((term) => {
    const normalized = normalizeTerm(term)
    const key = normalized.toLowerCase()
    if (!normalized || seen.has(key)) return
    seen.add(key)
    output.push(normalized)
  })

  return output.slice(0, limit)
}

function isStopWord(value = '') {
  return phantomStopWords.has(value.trim().toLowerCase())
}

export function isEligibleLexiconTerm(value = '', options = {}) {
  const {
    maxCjk = Infinity,
    maxLatin = Infinity,
    minCjk = 2,
    minLatin = 3,
  } = options

  const trimmed = normalizeTerm(value)
  if (!trimmed) return false

  const normalized = trimmed.toLowerCase()
  if (isStopWord(normalized)) return false

  const cjkChars = countCjkChars(trimmed)
  const latinChars = countLatinChars(trimmed)

  if (cjkChars > 0) {
    if (cjkChars < minCjk || cjkChars > maxCjk) return false
    return true
  }

  if (latinChars > 0) {
    if (latinChars < minLatin || latinChars > maxLatin) return false
    return true
  }

  return false
}

function parseUpdatedAt(value) {
  const timestamp = Date.parse(value ?? '')
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function reasonToLabel(reasonType) {
  if (reasonType === 'title') return '命中标题'
  if (reasonType === 'summary' || reasonType === 'snippet') return '命中摘要/正文'
  return '命中实体'
}

function splitCjkSegments(source = '') {
  return source
    .replace(/[，。！？；：、“”‘’（）()【】[\]<>《》|/\\]+/g, ' ')
    .split(/\s+/)
    .flatMap((segment) => segment.split(/(?:关于|因为|所以|如果|以及|或者|但是|并且|需要|可以|当前|相关|内容|问题|说明|为了|通过|已经|还有|之间|其中|这个|那个|这些|那些|一个|一种|在|中|的|和|与|及|并|把|被|对|将|而|或)+/))
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function extractLatinTerms(source = '', maxGram = 3) {
  const words = source
    .toLowerCase()
    .replace(/[^a-z0-9+\-.\s]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word && !isStopWord(word) && countLatinChars(word) >= 3)

  const terms = []

  words.forEach((word) => {
    terms.push(word)
  })

  for (let gram = 2; gram <= maxGram; gram += 1) {
    for (let index = 0; index <= words.length - gram; index += 1) {
      const candidate = words.slice(index, index + gram).join(' ')
      terms.push(candidate)
    }
  }

  return terms
}

function extractSummaryTerms(block) {
  const summaryText = extractAdaptiveLensSummaries(block.content ?? '').join(' ')
  if (!summaryText) return []

  const cjkTerms = splitCjkSegments(summaryText).filter((term) =>
    isEligibleLexiconTerm(term, { minCjk: 3, maxCjk: 12, maxLatin: 24 }),
  )
  const latinTerms = extractLatinTerms(summaryText, 2).filter((term) =>
    isEligibleLexiconTerm(term, { minCjk: 3, maxCjk: 12, maxLatin: 24 }),
  )

  return dedupeTerms([...cjkTerms, ...latinTerms], 12)
}

function extractSnippetTerms(block) {
  const plainText = Array.from(contentToPlainText(block.content ?? '')).slice(0, 100).join('')
  if (!plainText) return []

  const cjkTerms = splitCjkSegments(plainText).filter((term) =>
    isEligibleLexiconTerm(term, { minCjk: 3, maxCjk: 10, maxLatin: 20 }),
  )
  const latinTerms = extractLatinTerms(plainText, 2).filter((term) =>
    isEligibleLexiconTerm(term, { minCjk: 3, maxCjk: 10, maxLatin: 20 }),
  )

  return dedupeTerms([...cjkTerms, ...latinTerms], 10)
}

function buildCandidateTerms(block) {
  return [
    { reasonType: 'title', terms: [block.title?.trim() ?? ''] },
    { reasonType: 'project', terms: block.dimensions?.project ?? [] },
    { reasonType: 'domain', terms: block.dimensions?.domain ?? [] },
    { reasonType: 'summary', terms: extractSummaryTerms(block) },
    { reasonType: 'snippet', terms: extractSnippetTerms(block) },
  ]
}

function shouldReplaceEntry(current, nextEntry) {
  if (!current) return true
  if (nextEntry.priority !== current.priority) return nextEntry.priority < current.priority
  return parseUpdatedAt(nextEntry.updatedAt) >= parseUpdatedAt(current.updatedAt)
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
    buildCandidateTerms(block).forEach(({ reasonType, terms: candidateTerms }) => {
      candidateTerms.forEach((term) => {
        const normalizedTerm = normalizeTerm(term)
        if (!isEligibleLexiconTerm(normalizedTerm)) return

        const normalizedKey = normalizedTerm.toLowerCase()
        const nextEntry = {
          block,
          blockId: block.id,
          blockTitle: block.title,
          priority: reasonPriority[reasonType] ?? 99,
          reasonLabel: reasonToLabel(reasonType),
          reasonType,
          term: normalizedTerm,
          updatedAt: block.updatedAt,
        }

        const current = terms.get(normalizedKey)
        if (shouldReplaceEntry(current, nextEntry)) {
          terms.set(normalizedKey, nextEntry)
        }
      })
    })
  })

  const entries = [...terms.values()].sort((left, right) => {
    if (right.term.length !== left.term.length) return right.term.length - left.term.length
    if (left.priority !== right.priority) return left.priority - right.priority
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
    signature: entries
      .map((entry) => `${entry.blockId}:${entry.reasonType}:${entry.priority}:${entry.term}`)
      .join('|'),
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
      score:
        1000 +
        entry.term.length * 12 +
        (5 - (entry.priority ?? 4)) * 18 -
        distance +
        getPoolMatchScore(entry.block, activePoolContext),
      term: entry.term,
    })
  }

  return cues.sort((left, right) => {
    if (left.from !== right.from) return left.from - right.from
    if (right.matchText.length !== left.matchText.length) return right.matchText.length - left.matchText.length
    return right.score - left.score
  })
}
