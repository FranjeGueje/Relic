import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'graceful-fs'
import { basename, join } from 'path'
import { logError, logInfo } from 'backend/logger'
import { spawnAsync } from 'backend/utils'
import { relicRunnerPath } from 'backend/constants/paths'
import {
  findGameInAllUsers,
  getShortcutId,
  checkSteamProtocolHandler
} from './steam_helpers'
import type { AddGameToSteamOptions, AddGameToSteamResult, GameRunner } from './types'

const LOG_PREFIX = 'Relic'
const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 15000
const ADD_GAME_MARKER = '/tmp/addnonsteamgamefile'

export function createRelicBat(
  installPath: string,
  gameName: string,
  runner: GameRunner,
  appName: string
): string {
  const batPath = join(relicRunnerPath, `${gameName}.bat`)

  if (existsSync(batPath)) {
    logInfo(`${batPath} already exists`, LOG_PREFIX)
    return batPath
  }

  mkdirSync(relicRunnerPath, { recursive: true })

  const header = [
    '@echo off',
    'echo runner version 2',
    '@SET LEGENDARY_CONFIG_PATH=c:\\heroic\\Legendary',
    '@SET NILE_CONFIG_PATH=c:\\heroic\\',
    '@SET GOGDL_CONFIG_PATH=c:\\heroic\\',
    '@SET PATH=%PATH%;c:\\heroic\\bin'
  ]

  let runnerCmd: string
  switch (runner) {
    case 'legendary':
      runnerCmd = `@legendary launch ${appName} %*`
      break
    case 'gog':
      runnerCmd =
        `@gogdl --auth-config-path c:\\heroic\\gog_store\\auth.json ` +
        `launch --platform windows "${installPath}" ${appName} -- %*`
      break
    case 'nile':
      runnerCmd = `@nile launch ${appName} -- %*`
      break
    default:
      runnerCmd = '@echo En desarrollo...'
  }

  const content = [...header, '', runnerCmd].join('\n')
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
  const { gameName } = options

  const batPath = join(relicRunnerPath, `${gameName}.bat`)
  const steamName = basename(batPath)

  checkSteamProtocolHandler()

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
