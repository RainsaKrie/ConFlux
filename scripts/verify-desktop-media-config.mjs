import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function normalizeScopeEntries(entries = []) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => {
      if (typeof entry === 'string') return entry
      return entry?.path ?? ''
    })
    .filter(Boolean)
}

function readJson(relativePath) {
  const filePath = resolve(process.cwd(), relativePath)
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

try {
  console.log('verify:desktop-media-config')

  const capability = readJson('src-tauri/capabilities/default.json')
  const tauriConfig = readJson('src-tauri/tauri.conf.json')

  const permissions = Array.isArray(capability.permissions) ? capability.permissions : []
  const permissionIds = permissions.filter((entry) => typeof entry === 'string')
  const fsScopePermission = permissions.find(
    (entry) => typeof entry === 'object' && entry?.identifier === 'fs:scope',
  )

  const requiredFsPermissions = [
    'fs:allow-exists',
    'fs:allow-mkdir',
    'fs:allow-read-dir',
    'fs:allow-write-file',
    'fs:allow-remove',
  ]

  requiredFsPermissions.forEach((permission) => {
    assert(
      permissionIds.includes(permission),
      `desktop media capability is missing required permission: ${permission}`,
    )
  })

  const fsScope = normalizeScopeEntries(fsScopePermission?.allow)
  assert(
    fsScope.includes('$APPDATA/media'),
    'desktop media capability must allow $APPDATA/media in fs:scope',
  )
  assert(
    fsScope.includes('$APPDATA/media/*'),
    'desktop media capability must allow $APPDATA/media/* in fs:scope',
  )

  const assetProtocol = tauriConfig?.app?.security?.assetProtocol
  assert(assetProtocol?.enable === true, 'tauri assetProtocol must stay enabled for local media rendering')

  const assetScope = normalizeScopeEntries(assetProtocol?.scope)
  assert(
    assetScope.includes('$APPDATA/media'),
    'tauri assetProtocol scope must include $APPDATA/media',
  )
  assert(
    assetScope.includes('$APPDATA/media/*'),
    'tauri assetProtocol scope must include $APPDATA/media/*',
  )

  console.log('PASS verify:desktop-media-config')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`FAIL verify:desktop-media-config -> ${message}`)
  process.exitCode = 1
}
