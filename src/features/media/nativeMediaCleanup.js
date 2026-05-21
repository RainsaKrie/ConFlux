import {
  collectNativeMediaRelativePaths,
  MEDIA_DIRECTORY_NAME,
  MEDIA_FILE_NAME_PATTERN,
} from './mediaReference.js'

export function collectDirectoryNativeMediaRelativePaths(entries = []) {
  if (!Array.isArray(entries)) return []

  return entries
    .map((entry) => {
      const fileName = entry?.name ?? ''
      if (!fileName || !MEDIA_FILE_NAME_PATTERN.test(fileName)) return ''
      return `${MEDIA_DIRECTORY_NAME}/${fileName}`
    })
    .filter(Boolean)
}

export function computeOrphanedNativeMediaPaths(directoryEntries = [], referencedHtmlList = []) {
  const existingPaths = collectDirectoryNativeMediaRelativePaths(directoryEntries)
  if (!existingPaths.length) return []

  const referencedPaths = new Set(
    (Array.isArray(referencedHtmlList) ? referencedHtmlList : [])
      .flatMap((html) => collectNativeMediaRelativePaths(html)),
  )

  return existingPaths.filter((relativePath) => !referencedPaths.has(relativePath))
}
