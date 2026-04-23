const MEDIA_FILE_NAME_PATTERN_SOURCE = String.raw`(?:media|conflux_img)_[^/?#&"']+\.[a-z0-9]+`
const MEDIA_PATH_ATTRIBUTE_PATTERN = /data-media-relative-path=(["'])([\s\S]*?)\1/gi
const MEDIA_FILE_NAME_ATTRIBUTE_PATTERN = /data-media-file-name=(["'])([\s\S]*?)\1/gi
const MEDIA_SOURCE_ATTRIBUTE_PATTERN = /(?:src|href|data-media-href)=(["'])([\s\S]*?)\1/gi

export const MEDIA_DIRECTORY_NAME = 'media'
export const MEDIA_FILE_NAME_PATTERN = new RegExp(MEDIA_FILE_NAME_PATTERN_SOURCE, 'i')

export function normalizeMediaRelativePath(value = '') {
  return value.replace(/\\/g, '/').replace(/^\/+/, '').trim()
}

function createGlobalFileNamePattern() {
  return new RegExp(MEDIA_FILE_NAME_PATTERN_SOURCE, 'gi')
}

function normalizeMediaFileName(value = '') {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return MEDIA_FILE_NAME_PATTERN.test(trimmed) ? `${MEDIA_DIRECTORY_NAME}/${trimmed}` : ''
}

function extractMediaFileNamePaths(html = '') {
  return Array.from(
    html.matchAll(MEDIA_FILE_NAME_ATTRIBUTE_PATTERN),
    (match) => normalizeMediaFileName(match[2] ?? ''),
  ).filter(Boolean)
}

function extractMediaSourcePaths(html = '') {
  return Array.from(
    html.matchAll(MEDIA_SOURCE_ATTRIBUTE_PATTERN),
    (match) => Array.from((match[2] ?? '').matchAll(createGlobalFileNamePattern()), (fileMatch) =>
      `${MEDIA_DIRECTORY_NAME}/${fileMatch[0]}`),
  ).flat()
}

export function collectNativeMediaRelativePaths(html = '') {
  if (typeof html !== 'string' || !html.trim()) return []

  const explicitPaths = Array.from(
    html.matchAll(MEDIA_PATH_ATTRIBUTE_PATTERN),
    (match) => normalizeMediaRelativePath(match[2] ?? ''),
  ).filter(Boolean)

  return Array.from(
    new Set([
      ...explicitPaths,
      ...extractMediaFileNamePaths(html),
      ...extractMediaSourcePaths(html),
    ]),
  )
}

export function computeUnusedNativeMediaPaths(removedHtml = '', remainingHtmlList = []) {
  const removedPaths = collectNativeMediaRelativePaths(removedHtml)
  if (!removedPaths.length) return []

  const referencedPaths = new Set(
    (Array.isArray(remainingHtmlList) ? remainingHtmlList : [])
      .flatMap((html) => collectNativeMediaRelativePaths(html)),
  )

  return removedPaths.filter((relativePath) => !referencedPaths.has(relativePath))
}
