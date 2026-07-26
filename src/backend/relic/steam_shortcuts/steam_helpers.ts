import { existsSync, readdirSync } from 'graceful-fs'
import { readFileSync } from 'fs-extra'
import { join } from 'path'
import { homedir } from 'os'
import { parseBuffer, ShortcutObject } from 'steam-shortcut-editor'
import { GlobalConfig } from 'backend/config'
import { logError } from 'backend/logger'
import type { UserdataInfo, FindResult } from './types'

const LOG_PREFIX = 'Relic'

// ── Steam path info ──

export function getSteamPath(): string {
  const { defaultSteamPath } = GlobalConfig.get().getSettings()
  return defaultSteamPath.replaceAll("'", '')
}

export function getUserdataInfo(): UserdataInfo {
  const steamPath = getSteamPath()
  const userdataDir = join(steamPath, 'userdata')

  if (!existsSync(userdataDir)) {
    return { userdataDir, folders: [] }
  }

  const ignoreFolders = ['0', 'ac']
  const folders = readdirSync(userdataDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => !ignoreFolders.includes(d.name))
    .map((d) => d.name)

  return { userdataDir, folders }
}

// ── Shortcut parsing ──

const READ_RETRIES = 3

export function readShortcutsVdf(
  filePath: string
): Partial<ShortcutObject> | null {
  for (let i = 0; i < READ_RETRIES; i++) {
    if (!existsSync(filePath)) return null

    try {
      const content = readFileSync(filePath)
      return parseBuffer(content, {
        autoConvertArrays: true,
        autoConvertBooleans: true,
        dateProperties: ['LastPlayTime']
      })
    } catch (error) {
      if (i === READ_RETRIES - 1) {
        logError(`Failed to parse ${filePath}: ${error}`, LOG_PREFIX)
        return null
      }
    }
  }
  return null
}

export function getAppName(entry: Record<string, unknown>): string {
  return (
    (Object.entries(entry).find(
      ([k]) => k.toLowerCase() === 'appname'
    )?.[1] as string) ?? ''
  )
}

export function getShortcutId(entry: Record<string, unknown>): number {
  const id = entry.appid
  if (typeof id === 'number') return id >>> 0
  if (id === false || id === true) return 0
  return 0
}

// ── Game search ──

export function findGameInAllUsers(names: string | string[]): FindResult {
  const nameList = Array.isArray(names) ? names : [names]
  const { userdataDir, folders } = getUserdataInfo()

  if (folders.length === 0) {
    return {
      entry: null,
      found: false,
      error: `No Steam userdata directories found in ${userdataDir}`
    }
  }

  for (const folder of folders) {
    const shortcutsFile = join(userdataDir, folder, 'config', 'shortcuts.vdf')
    const content = readShortcutsVdf(shortcutsFile)
    if (!content?.shortcuts?.length) continue

    for (const name of nameList) {
      const entry = content.shortcuts.find(
        (e) => getAppName(e as unknown as Record<string, unknown>) === name
      )
      if (entry)
        return {
          entry: entry as unknown as Record<string, unknown>,
          found: true
        }
    }
  }

  return { entry: null, found: false }
}

export function findExistingGame(basenameWithExt: string): {
  found: boolean
  steamAppId?: number
} {
  const idx = basenameWithExt.lastIndexOf('.')
  const hasExt = idx > 0
  const name = hasExt ? basenameWithExt.slice(0, idx) : basenameWithExt
  const names = hasExt ? [basenameWithExt, name] : [name]
  const result = findGameInAllUsers(names)
  if (result.found && result.entry) {
    return { found: true, steamAppId: getShortcutId(result.entry) }
  }
  return { found: false }
}

// ── Protocol ──

export function checkSteamProtocolHandler(): void {
  const mimeFile = join(homedir(), '.config', 'mimeapps.list')

  if (!existsSync(mimeFile)) {
    logError(
      `steam:// protocol handler not registered. ${mimeFile} not found. The steam:// URL may not open correctly.`,
      LOG_PREFIX
    )
    return
  }

  try {
    const content = readFileSync(mimeFile).toString()
    if (
      !content
        .split('\n')
        .some((line) => line.toLowerCase().includes('x-scheme-handler/steam='))
    ) {
      logError(
        `steam:// protocol handler not registered in ${mimeFile}. The steam:// URL may not open correctly.`,
        LOG_PREFIX
      )
    }
  } catch (error) {
    logError(
      `Failed to read ${mimeFile}: ${error}. Cannot verify steam:// handler.`,
      LOG_PREFIX
    )
  }
}
