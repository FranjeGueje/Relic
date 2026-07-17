import { shell } from 'electron'
import { existsSync, writeFileSync } from 'graceful-fs'
import { join } from 'path'
import { logError, logInfo, LogPrefix } from 'backend/logger'
import {
  findGameInAllUsers,
  getShortcutId,
  getUserdataInfo,
  readShortcutsVdf,
  checkSteamProtocolHandler,
  getAppName
} from './steam_helpers'
import type { AddGameToSteamOptions, AddGameToSteamResult } from './types'

const LOG_PREFIX = LogPrefix.Relic
const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 15000

function createMockBat(installPath: string, gameName: string): string {
  const batPath = join(installPath, `${gameName}.bat`)

  if (existsSync(batPath)) {
    logInfo(`Mock .bat already exists at ${batPath}`, LOG_PREFIX)
    return batPath
  }

  const content = `@echo off\necho ${gameName}\npause\n`
  writeFileSync(batPath, content, 'utf-8')

  logInfo(`Created mock .bat at ${batPath}`, LOG_PREFIX)
  return batPath
}

function getInitialShortcutState(): Map<string, Set<number>> {
  const { userdataDir, folders } = getUserdataInfo()
  const state = new Map<string, Set<number>>()

  for (const folder of folders) {
    const shortcutsFile = join(userdataDir, folder, 'config', 'shortcuts.vdf')
    const content = readShortcutsVdf(shortcutsFile)
    if (!content?.shortcuts?.length) {
      state.set(folder, new Set())
      continue
    }

    const ids = new Set(
      content.shortcuts.map(
        (e) => getShortcutId(e as unknown as Record<string, unknown>)
      )
    )
    state.set(folder, ids)
  }

  return state
}

function detectNewEntry(
  previousState: Map<string, Set<number>>,
  gameName: string
): { steamAppId: number | null } {
  const { userdataDir, folders } = getUserdataInfo()

  for (const folder of folders) {
    const shortcutsFile = join(userdataDir, folder, 'config', 'shortcuts.vdf')
    const content = readShortcutsVdf(shortcutsFile)
    if (!content?.shortcuts?.length) continue

    const prevIds = previousState.get(folder) ?? new Set()

    for (const entry of content.shortcuts) {
      const entryRecord = entry as unknown as Record<string, unknown>
      const appid = getShortcutId(entryRecord)

      if (!prevIds.has(appid)) {
        const entryName = getAppName(entryRecord)
        if (entryName === gameName) {
          return { steamAppId: appid }
        }
      }
    }
  }

  return { steamAppId: null }
}

async function pollForNewEntry(
  previousState: Map<string, Set<number>>,
  gameName: string,
  startTime: number
): Promise<number | null> {
  const elapsed = Date.now() - startTime

  if (elapsed >= POLL_TIMEOUT_MS) {
    logError(
      `Timeout waiting for "${gameName}" to appear in Steam shortcuts (${POLL_TIMEOUT_MS}ms).`,
      LOG_PREFIX
    )
    return null
  }

  const { steamAppId } = detectNewEntry(previousState, gameName)

  if (steamAppId !== null) {
    return steamAppId
  }

  await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  return pollForNewEntry(previousState, gameName, startTime)
}

export async function addGameToSteam(
  options: AddGameToSteamOptions
): Promise<AddGameToSteamResult> {
  const { gameName, installPath, runner, appName } = options

  logInfo(
    `Adding "${gameName}" to Steam (runner: ${runner ?? 'unknown'}, appName: ${appName ?? 'unknown'})`,
    LOG_PREFIX
  )

  checkSteamProtocolHandler()

  const exists = findGameInAllUsers(gameName)

  if (exists.found) {
    logInfo(`"${gameName}" is already in Steam.`, LOG_PREFIX)
    return {
      success: false,
      alreadyExists: true,
      steamAppId: exists.entry
        ? getShortcutId(exists.entry)
        : undefined
    }
  }

  if (exists.error) {
    logError(exists.error, LOG_PREFIX)
    return { success: false, error: exists.error }
  }

  const batPath = createMockBat(installPath, gameName)
  const encodedPath = encodeURIComponent(batPath)
  const steamUrl = `steam://addnonsteamgame/${encodedPath}`

  const previousState = getInitialShortcutState()

  try {
    await shell.openExternal(steamUrl)
    logInfo(`Opened ${steamUrl}`, LOG_PREFIX)
  } catch (error) {
    logError(`Failed to open steam:// URL: ${error}`, LOG_PREFIX)
    return { success: false, error: `Failed to open steam:// URL: ${error}` }
  }

  logInfo(
    `Waiting for "${gameName}" to be added to Steam...`,
    LOG_PREFIX
  )

  const steamAppId = await pollForNewEntry(previousState, gameName, Date.now())

  if (steamAppId === null) {
    return {
      success: false,
      error:
        `"${gameName}" was not added to Steam in time. ` +
        `Make sure Steam is running and you confirmed the dialog.`
    }
  }

  logInfo(
    `"${gameName}" added to Steam with app ID ${steamAppId}.`,
    LOG_PREFIX
  )

  return {
    success: true,
    steamAppId
  }
}
