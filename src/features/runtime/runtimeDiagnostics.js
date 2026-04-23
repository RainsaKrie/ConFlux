import { appDataDir, join } from '@tauri-apps/api/path'
import { isTauriRuntime } from '../media/localMediaService'
import { MEDIA_DIRECTORY_NAME } from '../media/mediaReference'

export const PERSISTED_STORE_KEY = 'flux_blocks_store'
export const TAURI_STORE_FILE_NAME = 'conflux_universe.json'

function buildRuntimeDiagnostics() {
  if (!isTauriRuntime) {
    return {
      runtime: 'web',
      persistence: {
        mode: 'localstorage-web',
        locationType: 'key',
        locationValue: PERSISTED_STORE_KEY,
        mirrorType: null,
        mirrorValue: '',
      },
      media: {
        mode: 'data-url-web',
        locationType: 'mode',
        locationValue: 'data-url',
      },
    }
  }

  return {
    runtime: 'desktop',
    persistence: {
      mode: 'tauri-primary',
      locationType: 'path',
      locationValue: '',
      mirrorType: 'key',
      mirrorValue: PERSISTED_STORE_KEY,
    },
    media: {
      mode: 'appdata-media',
      locationType: 'path',
      locationValue: '',
    },
  }
}

export function getInitialRuntimeDiagnostics() {
  return buildRuntimeDiagnostics()
}

export async function getRuntimeDiagnostics() {
  if (!isTauriRuntime) {
    return buildRuntimeDiagnostics()
  }

  const basePath = await appDataDir()
  const storePath = await join(basePath, TAURI_STORE_FILE_NAME)
  const mediaPath = await join(basePath, MEDIA_DIRECTORY_NAME)

  return {
    runtime: 'desktop',
    persistence: {
      mode: 'tauri-primary',
      locationType: 'path',
      locationValue: storePath,
      mirrorType: 'key',
      mirrorValue: PERSISTED_STORE_KEY,
    },
    media: {
      mode: 'appdata-media',
      locationType: 'path',
      locationValue: mediaPath,
    },
  }
}
