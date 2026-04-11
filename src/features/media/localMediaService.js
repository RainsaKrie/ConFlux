import { convertFileSrc } from '@tauri-apps/api/core'
import { appDataDir, BaseDirectory, join } from '@tauri-apps/api/path'
import { exists, mkdir, writeFile } from '@tauri-apps/plugin-fs'

export const isTauriRuntime = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__)

const MEDIA_DIRECTORY_NAME = 'media'
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
  return extension && extension !== name ? extension.toLowerCase() : 'png'
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
    src: convertFileSrc(absolutePath),
  }
}
