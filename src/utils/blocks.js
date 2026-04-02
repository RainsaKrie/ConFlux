export function buildBlockId() {
  return `block_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

function decodeHtmlEntities(value = '') {
  if (!value) return ''

  if (typeof document === 'undefined') {
    return value
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  }

  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}

function readAdaptiveLensAttribute(source = '', attributeName) {
  const pattern = new RegExp(`\\b${attributeName}=(["'])([\\s\\S]*?)\\1`, 'i')
  const match = source.match(pattern)
  return decodeHtmlEntities(match?.[2] ?? '')
}

function buildAdaptiveLensPlainText(source = '') {
  const excerpt =
    readAdaptiveLensAttribute(source, 'excerpt') || readAdaptiveLensAttribute(source, 'data-excerpt')
  const summary =
    readAdaptiveLensAttribute(source, 'summary') || readAdaptiveLensAttribute(source, 'data-summary')
  const title = readAdaptiveLensAttribute(source, 'title') || readAdaptiveLensAttribute(source, 'data-title')
  const content = readAdaptiveLensAttribute(source, 'content') || readAdaptiveLensAttribute(source, 'data-content')

  return excerpt.trim() || summary.trim() || title.trim() || content.trim()
}

function readAdaptiveLensBlockId(source = '') {
  return (
    readAdaptiveLensAttribute(source, 'blockId') ||
    readAdaptiveLensAttribute(source, 'blockid') ||
    readAdaptiveLensAttribute(source, 'data-block-id')
  ).trim()
}

export function extractAdaptiveLensSummaries(content = '') {
  if (!content) return []

  if (typeof document !== 'undefined') {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content

    return [...tempDiv.querySelectorAll('adaptive-lens-node')]
      .map((node) => node.getAttribute('summary') || node.getAttribute('data-summary') || '')
      .map((summary) => summary.trim())
      .filter(Boolean)
  }

  return [...content.matchAll(/<adaptive-lens-node\b([^>]*)><\/adaptive-lens-node>/gi)]
    .map((match) => {
      const attributes = match[1] ?? ''
      return (
        readAdaptiveLensAttribute(attributes, 'summary') ||
        readAdaptiveLensAttribute(attributes, 'data-summary') ||
        ''
      ).trim()
    })
    .filter(Boolean)
}

export function contentToPlainText(content = '') {
  if (!content) return ''

  if (typeof document !== 'undefined') {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content

    tempDiv.querySelectorAll('adaptive-lens-node').forEach((node) => {
      const excerpt = node.getAttribute('excerpt') || node.getAttribute('data-excerpt') || ''
      const summary = node.getAttribute('summary') || node.getAttribute('data-summary') || ''
      const title = node.getAttribute('title') || node.getAttribute('data-title') || ''
      const sourceContent = node.getAttribute('content') || node.getAttribute('data-content') || ''
      const replacementText = excerpt.trim() || summary.trim() || title.trim() || sourceContent.trim()

      node.replaceWith(document.createTextNode(replacementText ? ` ${replacementText} ` : ' '))
    })

    return (tempDiv.textContent || tempDiv.innerText || '').replace(/\s+/g, ' ').trim()
  }

  return content
    .replace(/<adaptive-lens-node\b([^>]*)><\/adaptive-lens-node>/gi, (_, attributes) => {
      const replacementText = buildAdaptiveLensPlainText(attributes)
      return replacementText ? ` ${replacementText} ` : ' '
    })
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote|pre|ul|ol|br)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractBlockRelations(content = '') {
  const relations = []
  const seen = new Set()

  const pushRelation = (id, kind) => {
    if (!id) return
    const key = `${kind}:${id}`
    if (seen.has(key)) return
    seen.add(key)
    relations.push({ id, kind })
  }

  if (!content) return relations

  ;[...content.matchAll(/\{@(block_[\w-]+)(?:_[^}]*)?\}/g)].forEach((match) => {
    pushRelation(match[1], 'reference')
  })

  if (typeof document !== 'undefined') {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content

    tempDiv.querySelectorAll('adaptive-lens-node').forEach((node) => {
      pushRelation(
        node.getAttribute('blockId') ||
          node.getAttribute('blockid') ||
          node.getAttribute('data-block-id') ||
          '',
        'lens',
      )
    })

    return relations
  }

  ;[...content.matchAll(/<adaptive-lens-node\b([^>]*)><\/adaptive-lens-node>/gi)].forEach((match) => {
    pushRelation(readAdaptiveLensBlockId(match[1]), 'lens')
  })

  return relations
}

export function buildBlockTitle(content) {
  const compact = contentToPlainText(content).replace(/\s+/g, ' ').trim()
  if (!compact) return '未命名笔记'
  return compact.length > 30 ? `${compact.slice(0, 30)}...` : compact
}

export function getTodayStamp() {
  return new Date().toISOString().slice(0, 10)
}

export function normalizeBlockDimensions(dimensions = {}) {
  return {
    domain: Array.isArray(dimensions.domain) ? dimensions.domain : [],
    format: Array.isArray(dimensions.format) ? dimensions.format : [],
    project: Array.isArray(dimensions.project) ? dimensions.project : [],
    stage: Array.isArray(dimensions.stage) ? dimensions.stage : [],
    source: Array.isArray(dimensions.source) ? dimensions.source : [],
  }
}

export function extractBlockReferences(content) {
  return extractBlockRelations(content).map((relation) => relation.id)
}
