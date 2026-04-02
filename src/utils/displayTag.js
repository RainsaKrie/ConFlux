const BASE_VALUE_TRANSLATIONS = {
  'AI AutoTag': { zh: 'AI 生成', en: 'AI Generated' },
  'AI 生成': { zh: 'AI 生成', en: 'AI Generated' },
  'Quick Capture': { zh: '速记', en: 'Quick Capture' },
  '速记': { zh: '速记', en: 'Quick Capture' },
  '未分类': { zh: '未分类', en: 'Unsorted' },
  Unsorted: { zh: '未分类', en: 'Unsorted' },
  '碎片': { zh: '碎片', en: 'Fragment' },
  Fragment: { zh: '碎片', en: 'Fragment' },
  seed: { zh: '种子', en: 'Seed' },
  Seed: { zh: '种子', en: 'Seed' },
}

function normalizeLanguage(language = 'zh') {
  return language === 'en' ? 'en' : 'zh'
}

function translateValue(value = '', language = 'zh') {
  const entry = BASE_VALUE_TRANSLATIONS[value]
  if (!entry) return value
  return entry[normalizeLanguage(language)] ?? value
}

function translateSourcePrefix(value = '', language = 'zh') {
  if (value.startsWith('来源:')) {
    return language === 'en' ? value.replace(/^来源:/, 'Source:') : value
  }

  if (value.startsWith('Source:')) {
    return language === 'en' ? value : value.replace(/^Source:/, '来源:')
  }

  if (value.startsWith('知识碎块:')) {
    return language === 'en' ? value.replace(/^知识碎块:/, 'Thread Chunk:') : value
  }

  if (value.startsWith('Thread Chunk:')) {
    return language === 'en' ? value : value.replace(/^Thread Chunk:/, '知识碎块:')
  }

  return value
}

export function displayTag(tag = '', language = 'zh') {
  const normalizedTag = typeof tag === 'string' ? tag.trim() : ''
  if (!normalizedTag) return ''
  return translateValue(translateSourcePrefix(normalizedTag, language), language)
}

export function displayDimensionValue(dimension, value = '', language = 'zh') {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''
  if (!normalizedValue) return ''

  if (dimension === 'source' || dimension === 'domain' || dimension === 'format') {
    return translateValue(normalizedValue, language)
  }

  return normalizedValue
}

export function matchesDimensionValue(dimension, candidate = '', selected = '', language = 'zh') {
  return displayDimensionValue(dimension, candidate, language) === displayDimensionValue(dimension, selected, language)
}
