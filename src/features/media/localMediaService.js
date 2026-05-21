import { convertFileSrc } from '@tauri-apps/api/core'
import { appDataDir, BaseDirectory, join } from '@tauri-apps/api/path'
import { invoke } from '@tauri-apps/api/core'
import { exists, mkdir, readDir, remove, writeFile } from '@tauri-apps/plugin-fs'
import {
  collectNativeMediaRelativePaths,
  computeUnusedNativeMediaPaths,
  MEDIA_DIRECTORY_NAME,
  MEDIA_FILE_NAME_PATTERN,
  normalizeMediaRelativePath,
} from './mediaReference.js'
import { computeOrphanedNativeMediaPaths } from './nativeMediaCleanup.js'
import {
  describeAvailableAttachmentState,
  describeAvailableImageState,
  describeMissingAttachmentState,
  describeMissingImageState,
} from './nativeMediaRecovery.js'
import { recordMediaFallbackDiagnostic } from './mediaFallbackDiagnostics.js'
import { recordMediaMissingDiagnostic } from './mediaMissingDiagnostics.js'

const tauriWindow = typeof window !== 'undefined' ? window : null

export const isTauriRuntime = Boolean(tauriWindow?.__TAURI__ || tauriWindow?.__TAURI_INTERNALS__)
export const TAURI_MEDIA_ORIGIN = 'tauri-appdata'
export const NATIVE_ATTACHMENT_TAG = 'attachment-card'

const MISSING_MEDIA_PLACEHOLDER = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
    <rect width="960" height="540" rx="28" fill="#f4f4f5"/>
    <rect x="60" y="60" width="840" height="420" rx="24" fill="#fafafa" stroke="#d4d4d8" stroke-dasharray="10 10" stroke-width="4"/>
    <text x="480" y="248" text-anchor="middle" font-family="Segoe UI, Noto Sans SC, sans-serif" font-size="28" fill="#71717a">Local media is unavailable</text>
    <text x="480" y="292" text-anchor="middle" font-family="Segoe UI, Noto Sans SC, sans-serif" font-size="18" fill="#a1a1aa">The original file could not be found in the desktop media directory.</text>
  </svg>
`)
const MISSING_MEDIA_PLACEHOLDER_SRC = `data:image/svg+xml;charset=utf-8,${MISSING_MEDIA_PLACEHOLDER}`
let mediaDirectoryPromise = null

function recordMissingMediaEvent({ detection = '', kind = '', relativePath = '' } = {}) {
  const normalizedPath = normalizeMediaRelativePath(relativePath)
  if (!kind || !normalizedPath) return

  recordMediaMissingDiagnostic({
    detection,
    kind,
    relativePath: normalizedPath,
  })
}

function buildRandomToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 8)
  }

  return Math.random().toString(36).slice(2, 10)
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image file.'))
    reader.readAsDataURL(file)
  })
}

function inferFileExtension(file) {
  const mimeType = file.type ?? ''
  if (mimeType.startsWith('image/')) {
    return mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
  }

  const name = typeof file.name === 'string' ? file.name : ''
  const extension = name.split('.').pop()
  return extension && extension !== name ? extension.toLowerCase() : 'bin'
}

function buildImageFileName(file) {
  const extension = inferFileExtension(file)
  return `conflux_img_${Date.now()}_${buildRandomToken()}.${extension}`
}

function buildMediaFileName(file) {
  const extension = inferFileExtension(file)
  return `media_${Date.now()}_${buildRandomToken()}.${extension}`
}

async function writeNativeMediaFile(file, fileName) {
  const mediaDirectory = await ensureMediaDirectory()
  const relativePath = `${MEDIA_DIRECTORY_NAME}/${fileName}`
  const absolutePath = await join(mediaDirectory, fileName)
  const data = new Uint8Array(await file.arrayBuffer())

  await writeFile(relativePath, data, {
    baseDir: BaseDirectory.AppData,
  })

  return {
    absolutePath,
    fileName,
    relativePath,
  }
}

function inferMediaRelativePathFromElement(element) {
  if (!(element instanceof Element)) return ''

  const explicitRelativePath = normalizeMediaRelativePath(element.getAttribute('data-media-relative-path') ?? '')
  if (explicitRelativePath) return explicitRelativePath

  const explicitFileName = (element.getAttribute('data-media-file-name') ?? '').trim()
  if (explicitFileName) return `${MEDIA_DIRECTORY_NAME}/${explicitFileName}`

  const sourceCandidates = [
    element.getAttribute('src') ?? '',
    element.getAttribute('href') ?? '',
    element.getAttribute('data-media-href') ?? '',
  ]

  const matchedFileName = sourceCandidates
    .map((value) => value.match(MEDIA_FILE_NAME_PATTERN)?.[0] ?? '')
    .find(Boolean)

  return matchedFileName ? `${MEDIA_DIRECTORY_NAME}/${matchedFileName}` : ''
}

function annotateElementWithMediaMetadata(element) {
  if (!(element instanceof Element)) return ''

  const relativePath = inferMediaRelativePathFromElement(element)
  if (!relativePath) return ''

  const fileName = relativePath.split('/').pop() ?? ''
  element.setAttribute('data-media-origin', TAURI_MEDIA_ORIGIN)
  element.setAttribute('data-media-relative-path', relativePath)
  if (fileName) {
    element.setAttribute('data-media-file-name', fileName)
  }

  return relativePath
}

function applyMissingMediaState(image, missingAltText = 'Local media is unavailable.') {
  if (!(image instanceof HTMLImageElement)) return
  if (image.dataset.mediaMissing === 'true') return

  const relativePath = normalizeMediaRelativePath(image.dataset.mediaRelativePath ?? '')
  if (relativePath) {
    recordMissingMediaEvent({
      detection: 'runtime',
      kind: 'image',
      relativePath,
    })
  }

  const state = describeMissingImageState({
    currentAlt: image.alt ?? '',
    missingAltText,
    placeholderSrc: MISSING_MEDIA_PLACEHOLDER_SRC,
  })

  image.dataset.mediaMissing = state.mediaMissing
  image.src = state.src
  image.alt = state.alt
  image.title = state.title
}

function applyMissingAttachmentState(
  element,
  {
    missingAttachmentText = 'This local file is unavailable.',
    unavailableAttachmentLabel = 'Unavailable',
  } = {},
) {
  if (!(element instanceof Element)) return

  const relativePath = normalizeMediaRelativePath(element.getAttribute('data-media-relative-path') ?? '')
  if (relativePath) {
    recordMissingMediaEvent({
      detection: 'runtime',
      kind: 'attachment',
      relativePath,
    })
  }

  const state = describeMissingAttachmentState({
    missingAttachmentText,
    unavailableAttachmentLabel,
  })

  element.setAttribute('data-media-missing', state.mediaMissing)
  state.removeAttributes.forEach((attributeName) => element.removeAttribute(attributeName))
  element.setAttribute('title', state.title)
  element.setAttribute('data-unavailable-label', state.unavailableAttachmentLabel)
}

export async function ensureMediaDirectory() {
  if (!isTauriRuntime) return null
  if (mediaDirectoryPromise) return mediaDirectoryPromise

  mediaDirectoryPromise = (async () => {
    const directoryExists = await exists(MEDIA_DIRECTORY_NAME, {
      baseDir: BaseDirectory.AppData,
    })

    if (!directoryExists) {
      await mkdir(MEDIA_DIRECTORY_NAME, {
        baseDir: BaseDirectory.AppData,
        recursive: true,
      })
    }

    return join(await appDataDir(), MEDIA_DIRECTORY_NAME)
  })()

  return mediaDirectoryPromise
}

export async function ensureMediaDir() {
  return ensureMediaDirectory()
}

export async function resolveMediaAbsolutePath(relativePath = '') {
  if (!isTauriRuntime || !relativePath) return null
  return join(await appDataDir(), relativePath)
}

export async function resolveMediaSource(relativePath = '') {
  if (!isTauriRuntime || !relativePath) return null

  const absolutePath = await resolveMediaAbsolutePath(relativePath)
  return absolutePath ? convertFileSrc(absolutePath) : null
}

export async function getSafeAssetUrl(filePath = '') {
  if (!filePath) return ''
  if (!isTauriRuntime || String(filePath).startsWith('data:')) return filePath
  return convertFileSrc(filePath)
}

export async function getAssetUrl(filePath = '') {
  return getSafeAssetUrl(filePath)
}

export async function openNativeMedia(relativePath = '', fallbackHref = '') {
  if (!isTauriRuntime) {
    if (fallbackHref && typeof window !== 'undefined') {
      window.open(fallbackHref, '_blank', 'noopener,noreferrer')
    }
    return false
  }

  const normalizedPath = normalizeMediaRelativePath(relativePath)
  if (!normalizedPath) {
    throw new Error('openNativeMedia expects a media relative path.')
  }

  try {
    await invoke('open_native_media', {
      relativePath: normalizedPath,
    })
    return true
  } catch (error) {
    console.error('Failed to open native media file.', error)
    if (fallbackHref && typeof window !== 'undefined') {
      window.open(fallbackHref, '_blank', 'noopener,noreferrer')
    }
    return false
  }
}

export async function doesMediaExist(relativePath = '') {
  if (!isTauriRuntime || !relativePath) return false

  return exists(relativePath, {
    baseDir: BaseDirectory.AppData,
  })
}

function collectBlockMediaHtmlFragments(block = {}) {
  const fragments = []

  if (typeof block.content === 'string') {
    fragments.push(block.content)
  }

  if (Array.isArray(block.revisions)) {
    block.revisions.forEach((revision) => {
      if (typeof revision?.beforeContent === 'string') {
        fragments.push(revision.beforeContent)
      }

      if (typeof revision?.afterContent === 'string') {
        fragments.push(revision.afterContent)
      }
    })
  }

  return fragments
}

export function collectActiveMediaReferenceHtmlList(blocks = []) {
  if (!Array.isArray(blocks)) return []

  return blocks.flatMap((block) => collectBlockMediaHtmlFragments(block))
}

export function extractActiveMediaFiles(blocks = []) {
  const activeFileNames = new Set()

  collectActiveMediaReferenceHtmlList(blocks)
    .flatMap((html) => collectNativeMediaRelativePaths(html))
    .forEach((relativePath) => {
      const fileName = relativePath.split('/').pop() ?? ''
      if (fileName && MEDIA_FILE_NAME_PATTERN.test(fileName)) {
        activeFileNames.add(fileName)
      }
    })

  return activeFileNames
}

export async function cleanupUnusedNativeMedia(removedHtml = '', remainingHtmlList = []) {
  if (!isTauriRuntime) return []

  const removedPaths = computeUnusedNativeMediaPaths(removedHtml, remainingHtmlList)
  if (!removedPaths.length) return []

  const deletedPaths = []

  for (const relativePath of removedPaths) {
    if (!relativePath) continue

    try {
      const stillExists = await doesMediaExist(relativePath)
      if (!stillExists) continue

      await remove(relativePath, {
        baseDir: BaseDirectory.AppData,
      })
      deletedPaths.push(relativePath)
    } catch (error) {
      console.warn('Failed to clean up unused native media.', relativePath, error)
    }
  }

  return deletedPaths
}

export async function cleanupOrphanMedia(blocks = []) {
  if (!isTauriRuntime) return []

  try {
    const activeFileNames = extractActiveMediaFiles(blocks)
    const entries = await readDir(MEDIA_DIRECTORY_NAME, {
      baseDir: BaseDirectory.AppData,
    })
    const deletedFileNames = []

    for (const entry of entries) {
      const fileName = entry?.name ?? ''
      if (!fileName || !MEDIA_FILE_NAME_PATTERN.test(fileName)) continue
      if (activeFileNames.has(fileName)) continue

      try {
        await remove(`${MEDIA_DIRECTORY_NAME}/${fileName}`, {
          baseDir: BaseDirectory.AppData,
        })
        deletedFileNames.push(fileName)
        console.info(`[Media GC] Removed orphan file: ${fileName}`)
      } catch (error) {
        console.warn('[Media GC] Failed to remove orphan file.', fileName, error)
      }
    }

    return deletedFileNames
  } catch (error) {
    console.warn('[Media GC] Failed to scan native media directory.', error)
    return []
  }
}

export async function cleanupOrphanedNativeMediaFiles(referencedHtmlList = []) {
  if (!isTauriRuntime) return []

  try {
    const entries = await readDir(MEDIA_DIRECTORY_NAME, {
      baseDir: BaseDirectory.AppData,
    })
    const orphanedPaths = computeOrphanedNativeMediaPaths(entries, referencedHtmlList)
    const deletedPaths = []

    for (const relativePath of orphanedPaths) {
      try {
        await remove(relativePath, {
          baseDir: BaseDirectory.AppData,
        })
        deletedPaths.push(relativePath)
      } catch (error) {
        console.warn('Failed to remove orphaned native media file.', relativePath, error)
      }
    }

    return deletedPaths
  } catch (error) {
    console.warn('Failed to scan native media directory for orphaned files.', error)
    return []
  }
}

export function hasNativeMediaHint(html = '') {
  return typeof html === 'string'
    && (html.includes('<img') || html.includes(`<${NATIVE_ATTACHMENT_TAG}`))
    && (html.includes('data-media-origin') || MEDIA_FILE_NAME_PATTERN.test(html))
}

export async function rehydrateNativeMediaHtml(html = '', options = {}) {
  if (!isTauriRuntime || !html.trim() || typeof DOMParser === 'undefined') return html

  const missingAltText = options.missingAltText ?? 'Local media is unavailable.'
  const missingAttachmentText = options.missingAttachmentText ?? 'This local file is unavailable.'
  const openAttachmentLabel = options.openAttachmentLabel ?? 'Open file'
  const storedAttachmentLabel = options.storedAttachmentLabel ?? 'Stored locally'
  const unavailableAttachmentLabel = options.unavailableAttachmentLabel ?? 'Unavailable'
  const attachmentKickerLabel = options.attachmentKickerLabel ?? 'Local attachment'
  const document = new DOMParser().parseFromString(html, 'text/html')
  const images = Array.from(document.querySelectorAll('img'))
  const attachments = Array.from(document.querySelectorAll(NATIVE_ATTACHMENT_TAG))

  for (const image of images) {
    const relativePath = annotateElementWithMediaMetadata(image)
    const origin = image.getAttribute('data-media-origin')

    if (origin !== TAURI_MEDIA_ORIGIN || !relativePath) continue

    const existsOnDisk = await doesMediaExist(relativePath)
    if (!existsOnDisk) {
      recordMissingMediaEvent({
        detection: 'rehydrate',
        kind: 'image',
        relativePath,
      })
      const state = describeMissingImageState({
        currentAlt: image.getAttribute('alt') ?? '',
        missingAltText,
        placeholderSrc: MISSING_MEDIA_PLACEHOLDER_SRC,
      })

      image.setAttribute('data-media-missing', state.mediaMissing)
      image.setAttribute('src', state.src)
      image.setAttribute('alt', state.alt)
      image.setAttribute('title', state.title)
      continue
    }

    const src = await resolveMediaSource(relativePath)
    if (src) {
      const state = describeAvailableImageState(src)

      image.setAttribute('src', state.src)
      state.removeAttributes.forEach((attributeName) => image.removeAttribute(attributeName))
    }
  }

  for (const attachment of attachments) {
    const relativePath = annotateElementWithMediaMetadata(attachment)
    const origin = attachment.getAttribute('data-media-origin')

    if (origin !== TAURI_MEDIA_ORIGIN || !relativePath) continue

    attachment.setAttribute('data-open-label', openAttachmentLabel)
    attachment.setAttribute('data-stored-label', storedAttachmentLabel)
    attachment.setAttribute('data-unavailable-label', unavailableAttachmentLabel)
    attachment.setAttribute('data-kicker-label', attachmentKickerLabel)

    const existsOnDisk = await doesMediaExist(relativePath)
    if (!existsOnDisk) {
      recordMissingMediaEvent({
        detection: 'rehydrate',
        kind: 'attachment',
        relativePath,
      })
      applyMissingAttachmentState(attachment, {
        missingAttachmentText,
        unavailableAttachmentLabel,
      })
      continue
    }

    const href = await resolveMediaSource(relativePath)
    if (href) {
      const state = describeAvailableAttachmentState(href)

      attachment.setAttribute('data-media-href', state.href)
      state.removeAttributes.forEach((attributeName) => attachment.removeAttribute(attributeName))
    }
  }

  return document.body.innerHTML
}

export function attachNativeMediaIntegrityHandlers(container, options = {}) {
  if (!isTauriRuntime || !(container instanceof HTMLElement)) return () => {}

  const missingAltText = options.missingAltText ?? 'Local media is unavailable.'
  const missingAttachmentText = options.missingAttachmentText ?? 'This local file is unavailable.'
  const unavailableAttachmentLabel = options.unavailableAttachmentLabel ?? 'Unavailable'
  const teardown = []
  const images = Array.from(container.querySelectorAll('img'))
  const attachments = Array.from(container.querySelectorAll(NATIVE_ATTACHMENT_TAG))

  images.forEach((image) => {
    if (!(image instanceof HTMLImageElement)) return

    annotateElementWithMediaMetadata(image)
    if (image.dataset.mediaOrigin !== TAURI_MEDIA_ORIGIN) return

    if (image.dataset.mediaMissing === 'true') {
      applyMissingMediaState(image, missingAltText)
      return
    }

    const handleError = () => {
      applyMissingMediaState(image, missingAltText)
    }

    image.addEventListener('error', handleError, { once: true })
    teardown.push(() => image.removeEventListener('error', handleError))
  })

  attachments.forEach((attachment) => {
    annotateElementWithMediaMetadata(attachment)
    if (attachment.getAttribute('data-media-origin') !== TAURI_MEDIA_ORIGIN) return

    const action = attachment.querySelector('.flux-attachment-action')
    const relativePath = normalizeMediaRelativePath(attachment.getAttribute('data-media-relative-path') ?? '')
    const href = attachment.getAttribute('data-media-href') ?? ''
    if (action instanceof HTMLElement && relativePath && attachment.getAttribute('data-media-missing') !== 'true') {
      const handleOpen = (event) => {
        event.preventDefault()
        event.stopPropagation()
        void openNativeMedia(relativePath, href)
      }

      action.addEventListener('click', handleOpen)
      teardown.push(() => action.removeEventListener('click', handleOpen))
    }

    if (attachment.getAttribute('data-media-missing') === 'true') {
      applyMissingAttachmentState(attachment, {
        missingAttachmentText,
        unavailableAttachmentLabel,
      })
    }
  })

  return () => {
    teardown.forEach((dispose) => dispose())
  }
}

export async function saveImageFile(file) {
  if (!(file instanceof File)) {
    throw new Error('saveImageFile expects a File object.')
  }

  if (!isTauriRuntime) {
    return {
      filePath: await readFileAsDataUrl(file),
      fallbackReason: '',
      persistence: 'web-inline',
    }
  }

  try {
    const fileName = buildImageFileName(file)
    const { absolutePath } = await writeNativeMediaFile(file, fileName)

    return {
      filePath: absolutePath,
      fallbackReason: '',
      persistence: 'native-file',
    }
  } catch (error) {
    console.error('Failed to persist image to native media directory, falling back to Data URL.', error)
    recordMediaFallbackDiagnostic({
      count: 1,
      reason: error instanceof Error ? error.message : String(error),
    })
    return {
      filePath: await readFileAsDataUrl(file),
      fallbackReason: error instanceof Error ? error.message : String(error),
      persistence: 'inline-fallback',
    }
  }
}

export async function saveMedia(file) {
  if (!isTauriRuntime) {
    throw new Error('Native media persistence is only available in Tauri.')
  }

  try {
    const { absolutePath, fileName, relativePath } = await writeNativeMediaFile(file, buildMediaFileName(file))

    return {
      fileName,
      filePath: absolutePath,
      origin: TAURI_MEDIA_ORIGIN,
      relativePath,
      src: await getAssetUrl(absolutePath),
    }
  } catch (error) {
    console.error('Failed to persist attachment to native media directory.', error)
    throw error
  }
}

