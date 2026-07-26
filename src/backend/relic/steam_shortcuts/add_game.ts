import { existsSync, mkdirSync, symlinkSync, unlinkSync, writeFileSync } from 'graceful-fs'
import { basename, join } from 'path'
import { logError, logInfo } from 'backend/logger'
import { spawnAsync } from 'backend/utils'
import { relicRunnerPath, relicGamesPath } from 'backend/constants/paths'
import {
  findGameInAllUsers,
  findExistingGame,
  getShortcutId,
  checkSteamProtocolHandler
} from './steam_helpers'
import type { AddGameToSteamOptions, AddGameToSteamResult, GameRunner } from './types'
import { GameInfo } from 'common/types'

const LOG_PREFIX = 'Relic'

export function createRunnerFile(
  gameInfo: GameInfo,
  installPath: string
): { path: string } | { error: string } {
  if (gameInfo.runner === 'zoom') {
    const executable = gameInfo.install.executable
    return { path: executable ? join(installPath, executable) : '' }
  }

  try {
    const runnerPath = createRelicBat(
      installPath,
      gameInfo.title,
      gameInfo.runner,
      gameInfo.app_name
    )
    return { path: runnerPath }
  } catch (e) {
    logError(`Failed to create runner file: ${e}`, LOG_PREFIX)
    return { error: `Failed to create runner file: ${e}` }
  }
}

export function createRelicBat(
  installPath: string,
  gameName: string,
  runner: GameRunner,
  appName: string
): string {
  const runnerPath = join(relicRunnerPath, `${gameName}.bat`)

  mkdirSync(relicRunnerPath, { recursive: true })

  const header = [
    '@echo off',
    'echo Relic runner version 2',
    '@SET LEGENDARY_CONFIG_PATH=c:\\relic\\Legendary',
    '@SET NILE_CONFIG_PATH=c:\\relic\\',
    '@SET GOGDL_CONFIG_PATH=c:\\relic\\',
    '@SET PATH=%PATH%;c:\\relic\\bin'
  ]

  let runnerCmd: string
  switch (runner) {
    case 'legendary':
      runnerCmd = `@legendary launch ${appName} %*`
      break
    case 'gog': {
      const winPath = `c:\\games\\${basename(installPath)}`
      runnerCmd =
        `@gogdl --auth-config-path c:\\relic\\gog_store\\auth.json ` +
        `launch --platform windows "${winPath}" ${appName} -- %*`
      break
    }
    case 'nile':
      runnerCmd = `@nile launch ${appName} -- %*`
      break
    default:
      runnerCmd = '@echo En desarrollo...'
  }

  const content = [...header, '', runnerCmd].join('\n')
  writeFileSync(runnerPath, content, 'utf-8')

  logInfo(`Created ${runnerPath}`, LOG_PREFIX)
  return runnerPath
}

export function createGameSymlink(installPath: string): { linkPath: string } | { error: string } {
  if (!installPath) {
    return { error: 'No install path provided' }
  }
  const linkPath = join(relicGamesPath, basename(installPath))
  try {
    if (existsSync(linkPath)) {
      unlinkSync(linkPath)
    }
    mkdirSync(relicGamesPath, { recursive: true })
    symlinkSync(installPath, linkPath)
    logInfo(`Created symlink: ${linkPath} -> ${installPath}`, LOG_PREFIX)
    return { linkPath }
  } catch (error) {
    logError(`Failed to create symlink ${linkPath}: ${error}`, LOG_PREFIX)
    return { error: `Failed to create symlink: ${error}` }
  }
}

const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 15000
const ADD_GAME_MARKER = '/tmp/addnonsteamgamefile'

export async function addGameToSteam(
  options: AddGameToSteamOptions
): Promise<AddGameToSteamResult> {
  const { gameName, runnerPath } = options
  const steamName = basename(runnerPath)

  checkSteamProtocolHandler()

  const existing = findExistingGame(steamName)
  if (existing.found) {
    logInfo(`"${gameName}" already exists in Steam (ID ${existing.steamAppId}). Skipping.`, LOG_PREFIX)
    return { success: true, steamAppId: existing.steamAppId }
  }

  const encodedPath = encodeURIComponent(runnerPath)
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
