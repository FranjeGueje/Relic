import { existsSync, unlinkSync, writeFileSync } from 'graceful-fs'
import { basename, join } from 'path'
import { logError, logInfo } from 'backend/logger'
import { spawnAsync } from 'backend/utils'
import {
  findGameInAllUsers,
  getShortcutId,
  checkSteamProtocolHandler
} from './steam_helpers'
import type { AddGameToSteamOptions, AddGameToSteamResult } from './types'

const LOG_PREFIX = 'Relic'
const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 15000
const ADD_GAME_MARKER = '/tmp/addnonsteamgamefile'

export function createMockBat(installPath: string, gameName: string): string {
  const batPath = join(installPath, `${gameName}.bat`)

  if (existsSync(batPath)) {
    logInfo(`${batPath} already exists`, LOG_PREFIX)
    return batPath
  }

  const content = `@echo off\necho ${gameName}\npause\n`
  writeFileSync(batPath, content, 'utf-8')

  logInfo(`Created ${batPath}`, LOG_PREFIX)
  return batPath
}

async function waitForGameInSteam(
  gameName: string,
  startTime: number
): Promise<{ found: boolean; steamAppId?: number }> {
  const elapsed = Date.now() - startTime

  if (elapsed >= POLL_TIMEOUT_MS) {
    logError(
      `Timeout waiting for "${gameName}" to appear in Steam shortcuts (${POLL_TIMEOUT_MS}ms).`,
      LOG_PREFIX
    )
    return { found: false }
  }

  const result = findGameInAllUsers(gameName)

  if (result.found && result.entry) {
    return { found: true, steamAppId: getShortcutId(result.entry) }
  }

  await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  return waitForGameInSteam(gameName, startTime)
}

export async function addGameToSteam(
  options: AddGameToSteamOptions
): Promise<AddGameToSteamResult> {
  const { gameName, installPath } = options

  const batPath = join(installPath, `${gameName}.bat`)
  const steamName = basename(batPath)

  checkSteamProtocolHandler()

  createMockBat(installPath, gameName)
  const encodedPath = encodeURIComponent(batPath)
  const steamUrl = `steam://addnonsteamgame/${encodedPath}`

  try {
    unlinkSync(ADD_GAME_MARKER)
  } catch {
    // File doesn't exist, that's fine
  }
  writeFileSync(ADD_GAME_MARKER, '', 'utf-8')

  try {
    await spawnAsync('xdg-open', [steamUrl])
    logInfo(`Opened ${steamUrl}`, LOG_PREFIX)
  } catch (error) {
    logError(`Failed to open steam:// URL: ${error}`, LOG_PREFIX)
    return { success: false, error: `Failed to open steam:// URL: ${error}` }
  }

  logInfo(`Waiting for "${steamName}" to be added to Steam...`, LOG_PREFIX)

  const { found, steamAppId } = await waitForGameInSteam(
    steamName,
    Date.now()
  )

  if (!found) {
    return {
      success: false,
      error:
        `"${steamName}" was not added to Steam in time. ` +
        `Make sure Steam is running and you confirmed the dialog.`
    }
  }

  logInfo(
    `"${steamName}" added to Steam with app ID ${steamAppId}.`,
    LOG_PREFIX
  )

  return {
    success: true,
    steamAppId
  }
}
