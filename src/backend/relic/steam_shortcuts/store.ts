import { existsSync, readFileSync, writeFileSync } from 'graceful-fs'
import { join } from 'path'
import { appFolder } from 'backend/constants/paths'
import { logError, logInfo } from 'backend/logger'
import type { SteamShortcut } from './types'

const LOG_PREFIX = 'Relic'
const STORE_FILE = join(appFolder, 'steam_shortcuts.json')

let cache: SteamShortcut[] | null = null

function loadRaw(): SteamShortcut[] {
  if (!existsSync(STORE_FILE)) return []
  try {
    const raw = readFileSync(STORE_FILE, 'utf-8')
    return JSON.parse(raw) as SteamShortcut[]
  } catch {
    logError(`Failed to parse ${STORE_FILE}`, LOG_PREFIX)
    return []
  }
}

function save(shortcuts: SteamShortcut[]): void {
  try {
    writeFileSync(STORE_FILE, JSON.stringify(shortcuts, null, 2), 'utf-8')
  } catch (error) {
    logError(`Failed to write ${STORE_FILE}: ${error}`, LOG_PREFIX)
  }
  cache = shortcuts
}

export function listShortcuts(): SteamShortcut[] {
  if (cache) return cache
  cache = loadRaw()
  return cache
}

export function findShortcut(appId: string): SteamShortcut | undefined {
  return listShortcuts().find((s) => s.appId === appId)
}

export function addShortcut(appId: string, steamAppId: number, batPath: string, installPath: string): void {
  const shortcuts = listShortcuts()
  const existing = shortcuts.findIndex((s) => s.appId === appId)
  if (existing >= 0) {
    shortcuts[existing].steamAppId = steamAppId
    shortcuts[existing].batPath = batPath
    shortcuts[existing].installPath = installPath
  } else {
    shortcuts.push({ appId, steamAppId, batPath, installPath })
  }
  save(shortcuts)
  logInfo(`Saved shortcut: ${appId} → ${steamAppId}`, LOG_PREFIX)
}

export function removeShortcut(appId: string): void {
  const shortcuts = listShortcuts()
  const filtered = shortcuts.filter((s) => s.appId !== appId)
  save(filtered)
  logInfo(`Removed shortcut: ${appId}`, LOG_PREFIX)
}
