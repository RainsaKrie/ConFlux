import { invoke } from '@tauri-apps/api/core'
import { appDataDir, join } from '@tauri-apps/api/path'
import { isTauriRuntime } from '../media/localMediaService'
import { readLatestMediaFallbackDiagnostic } from '../media/mediaFallbackDiagnostics'
import { readLatestMediaMissingDiagnostic } from '../media/mediaMissingDiagnostics'
import { MEDIA_DIRECTORY_NAME } from '../media/mediaReference'
import { readLatestPersistenceRecoveryDiagnostic } from '../../store/persistenceRecoveryDiagnostics'

export const PERSISTED_STORE_KEY = 'flux_blocks_store'
export const TAURI_STORE_FILE_NAME = 'conflux_universe.json'
const RUNTIME_DIAGNOSTIC_OPEN_COMMANDS = {
  media: 'open_conflux_media_directory',
  persistence: 'open_conflux_store_file',
}

function buildRuntimeDiagnostics() {
  if (!isTauriRuntime) {
    return {
      runtime: 'web',
      persistence: {
        lastRecovery: readLatestPersistenceRecoveryDiagnostic(),
        mode: 'localstorage-web',
        locationType: 'key',
        locationValue: PERSISTED_STORE_KEY,
        mirrorType: null,
        mirrorValue: '',
      },
      media: {
        lastMissing: readLatestMediaMissingDiagnostic(),
        mode: 'data-url-web',
        locationType: 'mode',
        locationValue: 'data-url',
        lastFallback: readLatestMediaFallbackDiagnostic(),
      },
    }
  }

  return {
    runtime: 'desktop',
    persistence: {
      lastRecovery: readLatestPersistenceRecoveryDiagnostic(),
      mode: 'tauri-primary',
      locationType: 'path',
      locationValue: '',
      mirrorType: 'key',
      mirrorValue: PERSISTED_STORE_KEY,
    },
    media: {
      lastMissing: readLatestMediaMissingDiagnostic(),
      mode: 'appdata-media',
      locationType: 'path',
      locationValue: '',
      lastFallback: readLatestMediaFallbackDiagnostic(),
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
      lastRecovery: readLatestPersistenceRecoveryDiagnostic(),
      mode: 'tauri-primary',
      locationType: 'path',
      locationValue: storePath,
      mirrorType: 'key',
      mirrorValue: PERSISTED_STORE_KEY,
    },
    media: {
      lastMissing: readLatestMediaMissingDiagnostic(),
      mode: 'appdata-media',
      locationType: 'path',
      locationValue: mediaPath,
      lastFallback: readLatestMediaFallbackDiagnostic(),
    },
  }
}

export async function openRuntimeDiagnosticLocation(target = '') {
  if (!isTauriRuntime) return false

  const command = RUNTIME_DIAGNOSTIC_OPEN_COMMANDS[target]
  if (!command) return false

  await invoke(command)
  return true
}
