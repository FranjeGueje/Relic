import { existsSync, unlinkSync } from 'graceful-fs'
import { shell } from 'electron'
import { Game } from 'common/types/game_manager'
import { GameInfo } from 'common/types'
import { basename, join } from 'path'
import { libraryManagerMap } from 'backend/storeManagers'
import { relicGamesPath } from 'backend/constants/paths'
import { logError, logInfo } from 'backend/logger'
import { addGameToSteam, createRunnerFile, findShortcut, addShortcut, removeShortcut } from './steam_shortcuts'
import { preparePrefix, removePrefixSymlink } from './prefix'
import { sendFrontendMessage } from 'backend/ipc'
import type { AddGameToSteamResult } from './steam_shortcuts/types'
import { downloadGrids, deleteGrids } from './steamgrid'

const LOG_PREFIX = 'Relic'

function refreshInstallPath(gameInfo: GameInfo): string {
  try {
    const manager = libraryManagerMap[
      gameInfo.runner as keyof typeof libraryManagerMap
    ] as unknown as {
      getGameInfo?: (appName: string, forceReload: boolean) => GameInfo | undefined
      refreshInstalled?: () => void
    }
    manager.refreshInstalled?.()
    const freshInfo = manager.getGameInfo?.(gameInfo.app_name, true)
    if (freshInfo) {
      return freshInfo.install.install_path ?? ''
    }
  } catch (e) {
    logError(
      `Failed to refresh game info for ${gameInfo.runner}: ${e}`,
      LOG_PREFIX
    )
  }
  return gameInfo.install.install_path ?? ''
}

export async function onGameInstalled(
  game: Game,
  installPath?: string
): Promise<AddGameToSteamResult> {
  const gameInfo = game.getGameInfo()
  const appName = gameInfo.app_name

  const known = findShortcut(appName)
  if (known) {
    logInfo(
      `"${gameInfo.title}" (${appName}) is already tracked in Steam (ID ${known.steamAppId}). Skipping.`,
      LOG_PREFIX
    )
    return { success: true, steamAppId: known.steamAppId }
  }

  const resolvedPath = installPath || refreshInstallPath(gameInfo)
  if (!resolvedPath) {
    logError(
      `No install path for "${gameInfo.title}" (${appName})`,
      LOG_PREFIX
    )
    return { success: false, error: `No install path for "${gameInfo.title}" (${appName})` }
  }

  const runnerFile = createRunnerFile(gameInfo, resolvedPath)
  if ('error' in runnerFile) {
    return { success: false, error: runnerFile.error }
  }

  const result = await addGameToSteam({
    gameName: gameInfo.title,
    runnerPath: runnerFile.path
  })

  if (!result.success) {
    logError(
      `Failed to add "${gameInfo.title}" to Steam: ${result.error}`,
      LOG_PREFIX
    )
    return result
  }

  if (result.steamAppId) {
    addShortcut(
      gameInfo.title,
      appName,
      gameInfo.runner,
      result.steamAppId,
      resolvedPath,
      runnerFile.path
    )

    await preparePrefix(gameInfo, result.steamAppId, resolvedPath)

    await downloadGrids(gameInfo, result.steamAppId)

    sendFrontendMessage('installCompleted', {
      gameTitle: gameInfo.title,
      steamAppId: result.steamAppId
    })
    shell.openExternal(`steam://gameproperties/${result.steamAppId}`)
  }

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

  if (known?.store === 'zoom') {
    if (known?.steamAppId) {
      removePrefixSymlink(known.steamAppId)
    }
  } else {
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
  }

  if (known?.steamAppId) {
    deleteGrids(known.steamAppId)
  }

  removeShortcut(appName)
  logInfo(`Removing ${gameInfo.title} from Steam shortcuts`, LOG_PREFIX)
}
