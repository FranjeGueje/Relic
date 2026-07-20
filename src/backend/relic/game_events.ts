import { existsSync, unlinkSync } from 'graceful-fs'
import { shell } from 'electron'
import { Game } from 'common/types/game_manager'
import { GameInfo } from 'common/types'
import { basename, join } from 'path'
import { libraryManagerMap } from 'backend/storeManagers'
import { relicGamesPath } from 'backend/constants/paths'
import { logError, logInfo } from 'backend/logger'
import { addGameToSteam, createRelicBat, findShortcut, addShortcut, removeShortcut } from './steam_shortcuts'
import { windowify } from './windowify'
import { preparePrefix, prepareUmuPrefix } from './prefix'
import { removeNonSteamGame } from 'backend/shortcuts/nonesteamgame/nonesteamgame'
import { notify } from 'backend/dialog/dialog'
import type { AddGameToSteamResult, GameRunner } from './steam_shortcuts/types'
import { downloadGrids } from './steamgrid'

const LOG_PREFIX = 'Relic'

type GameInput =
  | { kind: 'ready'; gameInfo: GameInfo; installPath: string }
  | { kind: 'skip'; steamAppId: number }
  | { kind: 'error'; error: string }

function validateGameInput(
  game: Game,
  installPath?: string
): GameInput {
  const gameInfo = game.getGameInfo()
  const appName = gameInfo.app_name

  const known = findShortcut(appName)
  if (known) {
    logInfo(
      `"${gameInfo.title}" (${appName}) is already tracked in Steam (ID ${known.steamAppId}). Skipping.`,
      LOG_PREFIX
    )
    return { kind: 'skip', steamAppId: known.steamAppId }
  }

  let resolvedGameInfo = gameInfo
  let resolvedPath = installPath

  if (!resolvedPath) {
    try {
      const manager = libraryManagerMap[
        gameInfo.runner as keyof typeof libraryManagerMap
      ] as unknown as {
        getGameInfo?: (appName: string, forceReload: boolean) => GameInfo | undefined
        refreshInstalled?: () => void
      }
      manager.refreshInstalled?.()
      const freshInfo = manager.getGameInfo?.(appName, true)
      if (freshInfo) {
        resolvedGameInfo = freshInfo
      }
    } catch (e) {
      logError(
        `Failed to refresh game info for ${gameInfo.runner}: ${e}`,
        LOG_PREFIX
      )
    }

    resolvedPath = resolvedGameInfo.install.install_path ?? ''
  }

  if (!resolvedPath) {
    logError(
      `No install path for "${gameInfo.title}" (${appName})`,
      LOG_PREFIX
    )
    return { kind: 'error', error: `No install path for "${gameInfo.title}" (${appName})` }
  }

  return { kind: 'ready', gameInfo: resolvedGameInfo, installPath: resolvedPath }
}

function createRunnerFile(
  gameInfo: GameInfo,
  installPath: string
): { path: string } | { error: string } {
  try {
    const batPath = createRelicBat(
      installPath,
      gameInfo.title,
      gameInfo.runner as GameRunner,
      gameInfo.app_name
    )
    return { path: batPath }
  } catch (e) {
    logError(`Failed to create runner file: ${e}`, LOG_PREFIX)
    return { error: `Failed to create runner file: ${e}` }
  }
}

async function addToSteam(
  gameInfo: GameInfo,
  installPath: string,
  batPath: string
): Promise<AddGameToSteamResult> {
  const result = await addGameToSteam({ gameName: gameInfo.title })

  if (!result.success) {
    logError(
      `Failed to add "${gameInfo.title}" to Steam: ${result.error}`,
      LOG_PREFIX
    )
    return result
  }

  addShortcut(
    gameInfo.title,
    gameInfo.app_name,
    gameInfo.runner,
    result.steamAppId!,
    installPath,
    batPath
  )

  return result
}

export async function onGameInstalled(
  game: Game,
  installPath?: string
): Promise<AddGameToSteamResult> {
  const input = validateGameInput(game, installPath)

  if (input.kind === 'skip') {
    return { success: true, steamAppId: input.steamAppId }
  }

  if (input.kind === 'error') {
    return { success: false, error: input.error }
  }

  const runnerFile = createRunnerFile(input.gameInfo, input.installPath)
  if ('error' in runnerFile) {
    return { success: false, error: runnerFile.error }
  }

  const result = await addToSteam(input.gameInfo, input.installPath, runnerFile.path)

  if (result.success && result.steamAppId) {
    windowify(input.gameInfo)
    preparePrefix(result.steamAppId)
    const gridsDownloaded = await downloadGrids(input.gameInfo, result.steamAppId)
    if (gridsDownloaded) {
      notify({
        title: 'Added to Steam',
        body: `"${input.gameInfo.title}" was added to Steam. Restart Steam to see the grid images.`
      })
    }
    shell.openExternal(`steam://gameproperties/${result.steamAppId}`)
  }
  prepareUmuPrefix(input.gameInfo)

  return result
}

export async function onGameImported(game: Game): Promise<void> {
  const gameInfo = game.getGameInfo()
  logInfo(
    `Game imported: "${gameInfo.title}" (${gameInfo.app_name})`,
    LOG_PREFIX
  )
}

export async function onGameMoved(
  game: Game,
  newInstallPath: string
): Promise<void> {
  const gameInfo = game.getGameInfo()
  logInfo(
    `Game moved: "${gameInfo.title}" (${gameInfo.app_name}) to ${newInstallPath}`,
    LOG_PREFIX
  )
}

export async function onGameUninstalled(game: Game) {
  const gameInfo = game.getGameInfo()
  const appName = gameInfo.app_name

  const known = findShortcut(appName)
  if (known?.steamAppId) {
    shell.openExternal(`steam://gameproperties/${known.steamAppId}`)
  }

  if (known?.execPath) {
    try {
      if (existsSync(known.execPath)) {
        unlinkSync(known.execPath)
        logInfo(`Deleted ${known.execPath}`, LOG_PREFIX)
      }
    } catch (e) {
      logError(`Failed to delete ${known.execPath}: ${e}`, LOG_PREFIX)
    }
  }

  if (known?.installPath) {
    const linkPath = join(relicGamesPath, basename(known.installPath))
    try {
      unlinkSync(linkPath)
      logInfo(`Deleted symlink ${linkPath}`, LOG_PREFIX)
    } catch {}
  }

  removeShortcut(appName)
  logInfo(`Removing ${gameInfo.title} from Steam shortcuts`, LOG_PREFIX)

  await removeNonSteamGame(game)
}
