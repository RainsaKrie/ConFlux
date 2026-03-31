export function buildBlockId() {
  return `block_${Date.now().toString().slice(-8)}`
}

export function contentToPlainText(content = '') {
  return content
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote|pre|ul|ol|br)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildBlockTitle(content) {
  const compact = contentToPlainText(content).replace(/\s+/g, ' ').trim()
  if (!compact) return 'Untitled Flux Note'
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
  return [...content.matchAll(/\{@(block_[\w-]+)(?:_[^}]*)?\}/g)].map((match) => match[1])
}
