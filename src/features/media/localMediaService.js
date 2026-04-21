import { convertFileSrc } from '@tauri-apps/api/core'
import { appDataDir, BaseDirectory, join } from '@tauri-apps/api/path'
import { exists, mkdir, readDir, remove, writeFile } from '@tauri-apps/plugin-fs'
import {
  collectNativeMediaRelativePaths,
  computeUnusedNativeMediaPaths,
  MEDIA_DIRECTORY_NAME,
  MEDIA_FILE_NAME_PATTERN,
  normalizeMediaRelativePath,
} from './mediaReference'

export const isTauriRuntime = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__)
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

function buildRandomToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 8)
  }

  return Math.random().toString(36).slice(2, 10)
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

function buildMissingLabel(currentLabel = '', missingLabel = '') {
  return currentLabel.trim() ? `${currentLabel} · ${missingLabel}` : missingLabel
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

  image.dataset.mediaMissing = 'true'
  image.src = MISSING_MEDIA_PLACEHOLDER_SRC
  image.alt = buildMissingLabel(image.alt ?? '', missingAltText)
  image.title = missingAltText
}

function applyMissingAttachmentState(
  element,
  {
    missingAttachmentText = 'This local file is unavailable.',
    unavailableAttachmentLabel = 'Unavailable',
  } = {},
) {
  if (!(element instanceof Element)) return

  element.setAttribute('data-media-missing', 'true')
  element.removeAttribute('data-media-href')
  element.setAttribute('title', missingAttachmentText)
  element.setAttribute('data-unavailable-label', unavailableAttachmentLabel)
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

export async function resolveMediaAbsolutePath(relativePath = '') {
  if (!isTauriRuntime || !relativePath) return null
  return join(await appDataDir(), relativePath)
}

export async function resolveMediaSource(relativePath = '') {
  if (!isTauriRuntime || !relativePath) return null

  const absolutePath = await resolveMediaAbsolutePath(relativePath)
  return absolutePath ? convertFileSrc(absolutePath) : null
}

export async function doesMediaExist(relativePath = '') {
  if (!isTauriRuntime || !relativePath) return false

  return exists(relativePath, {
    baseDir: BaseDirectory.AppData,
  })
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

export async function cleanupOrphanedNativeMediaFiles(referencedHtmlList = []) {
  if (!isTauriRuntime) return []

  const referencedPaths = new Set(
    (Array.isArray(referencedHtmlList) ? referencedHtmlList : [])
      .flatMap((html) => collectNativeMediaRelativePaths(html)),
  )

  try {
    const entries = await readDir(MEDIA_DIRECTORY_NAME, {
      baseDir: BaseDirectory.AppData,
    })
    const deletedPaths = []

    for (const entry of entries) {
      const fileName = entry?.name ?? ''
      if (!fileName || !MEDIA_FILE_NAME_PATTERN.test(fileName)) continue

      const relativePath = `${MEDIA_DIRECTORY_NAME}/${fileName}`
      if (referencedPaths.has(relativePath)) continue

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
      image.setAttribute('data-media-missing', 'true')
      image.setAttribute('src', MISSING_MEDIA_PLACEHOLDER_SRC)
      image.setAttribute(
        'alt',
        buildMissingLabel(image.getAttribute('alt') ?? '', missingAltText),
      )
      image.setAttribute('title', missingAltText)
      continue
    }

    const src = await resolveMediaSource(relativePath)
    if (src) {
      image.setAttribute('src', src)
      image.removeAttribute('data-media-missing')
      image.removeAttribute('title')
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
      applyMissingAttachmentState(attachment, {
        missingAttachmentText,
        unavailableAttachmentLabel,
      })
      continue
    }

    const href = await resolveMediaSource(relativePath)
    if (href) {
      attachment.setAttribute('data-media-href', href)
      attachment.removeAttribute('data-media-missing')
      attachment.removeAttribute('title')
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

export async function saveMedia(file) {
  if (!isTauriRuntime) {
    throw new Error('Native media persistence is only available in Tauri.')
  }

  const mediaDirectory = await ensureMediaDirectory()
  const extension = inferFileExtension(file)
  const fileName = `media_${Date.now()}_${buildRandomToken()}.${extension}`
  const relativePath = `${MEDIA_DIRECTORY_NAME}/${fileName}`
  const absolutePath = await join(mediaDirectory, fileName)
  const data = new Uint8Array(await file.arrayBuffer())

  await writeFile(relativePath, data, {
    baseDir: BaseDirectory.AppData,
  })

  return {
    fileName,
    filePath: absolutePath,
    origin: TAURI_MEDIA_ORIGIN,
    relativePath,
    src: convertFileSrc(absolutePath),
  }
}

