import { buildBlockTitle, contentToPlainText } from './blocks'

export const LONGFORM_CAPTURE_THRESHOLD = 800
export const MAX_SEMANTIC_CHUNK_LENGTH = 1000

const MAX_CHUNK_LENGTH = MAX_SEMANTIC_CHUNK_LENGTH
const MIN_SENTENCE_CHUNK = 120

function normalizeText(text = '') {
  return text.replace(/\r\n/g, '\n').replace(/\t/g, '  ').trim()
}

function cleanChunk(text = '') {
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

function extractHeadingLine(text = '') {
  const firstLine = text.split('\n')[0]?.trim() ?? ''
  const headingMatch = firstLine.match(/^#{1,3}\s+(.+)$/)
  return {
    headingLine: headingMatch ? firstLine : '',
    headingTitle: headingMatch?.[1]?.trim() ?? '',
  }
}

function splitByMarkdownHeadings(text = '') {
  const normalized = normalizeText(text)
  if (!/(^|\n)#{1,3}\s+\S/m.test(normalized)) return []

  const lines = normalized.split('\n')
  const sections = []
  let current = []

  lines.forEach((line) => {
    if (/^#{1,3}\s+\S/.test(line.trim())) {
      if (current.length) {
        sections.push(cleanChunk(current.join('\n')))
      }
      current = [line]
      return
    }

    current.push(line)
  })

  if (current.length) {
    sections.push(cleanChunk(current.join('\n')))
  }

  return sections.filter(Boolean)
}

function splitByParagraphs(text = '') {
  return normalizeText(text)
    .split(/\n{2,}/)
    .map((part) => cleanChunk(part))
    .filter(Boolean)
}

function tokenizeSentences(text = '') {
  const normalized = cleanChunk(text).replace(/\n+/g, ' ')
  if (!normalized) return []

  const sentences = []
  let current = ''

  for (const char of normalized) {
    current += char
    if (/[。！？!?]/.test(char)) {
      if (current.trim()) {
        sentences.push(current.trim())
      }
      current = ''
    }
  }

  if (current.trim()) {
    sentences.push(current.trim())
  }

  return sentences.length ? sentences : [normalized]
}

function forceSplitLongText(text = '', maxLength = MAX_CHUNK_LENGTH) {
  const normalized = cleanChunk(text)
  if (normalized.length <= maxLength) return normalized ? [normalized] : []

  const segments = []
  let remaining = normalized

  while (remaining.length > maxLength) {
    let splitIndex = remaining.lastIndexOf(' ', maxLength)
    if (splitIndex < Math.floor(maxLength * 0.45)) {
      splitIndex = maxLength
    }

    segments.push(cleanChunk(remaining.slice(0, splitIndex)))
    remaining = cleanChunk(remaining.slice(splitIndex))
  }

  if (remaining) {
    segments.push(remaining)
  }

  return segments.filter(Boolean)
}

function splitParagraphBySentences(text = '', maxLength = MAX_CHUNK_LENGTH) {
  const sentences = tokenizeSentences(text)
  if (sentences.length <= 1) {
    return forceSplitLongText(text, maxLength)
  }

  const chunks = []
  let current = ''

  sentences.forEach((sentence) => {
    if (sentence.length > maxLength) {
      if (current.trim()) {
        chunks.push(cleanChunk(current))
        current = ''
      }
      chunks.push(...forceSplitLongText(sentence, maxLength))
      return
    }

    const candidate = current ? `${current} ${sentence}` : sentence
    if (candidate.length <= maxLength || current.length < MIN_SENTENCE_CHUNK) {
      current = candidate
      return
    }

    if (current.trim()) {
      chunks.push(cleanChunk(current))
    }
    current = sentence
  })

  if (current.trim()) {
    chunks.push(cleanChunk(current))
  }

  return chunks.filter(Boolean)
}

function splitLongSection(section = '', maxLength = MAX_CHUNK_LENGTH) {
  const normalized = cleanChunk(section)
  if (!normalized) return []
  if (normalized.length <= maxLength) return [normalized]

  const { headingLine } = extractHeadingLine(normalized)
  const headingPrefix = headingLine ? `${headingLine}\n\n` : ''
  const availableMaxLength = Math.max(120, maxLength - headingPrefix.length)
  const body = headingLine ? cleanChunk(normalized.slice(headingLine.length)) : normalized
  const paragraphs = splitByParagraphs(body)
  const chunks = []
  let current = ''

  const pushCurrent = () => {
    if (!current.trim()) return
    const chunkBody = cleanChunk(current)
    chunks.push(headingLine ? cleanChunk(`${headingPrefix}${chunkBody}`) : chunkBody)
    current = ''
  }

  paragraphs.forEach((paragraph) => {
    const paragraphPieces =
      paragraph.length > availableMaxLength ? splitParagraphBySentences(paragraph, availableMaxLength) : [paragraph]

    paragraphPieces.forEach((piece) => {
      const candidate = current ? `${current}\n\n${piece}` : piece
      const candidateWithHeading = headingLine ? `${headingPrefix}${candidate}` : candidate

      if (candidateWithHeading.length <= maxLength) {
        current = candidate
        return
      }

      pushCurrent()

      const standaloneWithHeading = headingLine ? `${headingPrefix}${piece}` : piece
      if (standaloneWithHeading.length <= maxLength) {
        current = piece
        return
      }

      const forcedPieces = splitParagraphBySentences(piece, availableMaxLength)
      forcedPieces.forEach((forcedPiece) => {
        chunks.push(headingLine ? cleanChunk(`${headingPrefix}${forcedPiece}`) : cleanChunk(forcedPiece))
      })
    })
  })

  pushCurrent()

  return chunks.filter(Boolean)
}

export function splitIntoSemanticChunks(text = '') {
  const normalized = normalizeText(text)
  if (!normalized) return []

  const baseSections = splitByMarkdownHeadings(normalized)
  const sections = baseSections.length ? baseSections : splitByParagraphs(normalized)
  const sourceSections = sections.length ? sections : [normalized]

  return sourceSections.flatMap((section) => splitLongSection(section, MAX_CHUNK_LENGTH))
}

export function buildThreadId() {
  return `thread_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export function buildThreadProjectLabel(text = '', threadId = '', language = 'zh') {
  const plainText = contentToPlainText(text)
  const firstLine = plainText.split('\n')[0]?.trim() || plainText.trim()
  const compact = firstLine.replace(/\s+/g, ' ').slice(0, 15).trim() || (language === 'en' ? 'Longform Chunk' : '长文切块')
  const suffix = threadId.replace(/^thread_/, '').slice(-6)
  return language === 'en' ? `Source:${compact}_${suffix}` : `来源:${compact}_${suffix}`
}

export function buildThreadSourceLabel(threadId = '', language = 'zh') {
  return language === 'en' ? `Thread Chunk:${threadId}` : `知识碎块:${threadId}`
}

export function buildSemanticChunkTitle(chunk = '', index = 0, total = 1, language = 'zh') {
  const { headingTitle } = extractHeadingLine(chunk)
  const baseTitle = headingTitle || buildBlockTitle(chunk, language)
  if (total <= 1) return baseTitle

  const order = String(index + 1).padStart(2, '0')
  return `${baseTitle} · ${order}`
}
