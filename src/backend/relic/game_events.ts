import { existsSync, unlinkSync } from 'graceful-fs'
import { Game } from 'common/types/game_manager'
import { GameInfo } from 'common/types'
import { libraryManagerMap } from 'backend/storeManagers'
import { logError, logInfo } from 'backend/logger'
import { addGameToSteam, createRelicBat, findShortcut, addShortcut, removeShortcut } from './steam_shortcuts'
import { removeNonSteamGame } from 'backend/shortcuts/nonesteamgame/nonesteamgame'
import type { AddGameToSteamResult, GameRunner } from './steam_shortcuts/types'

const LOG_PREFIX = 'Relic'

export async function onGameInstalled(
  game: Game,
  installPath?: string
): Promise<AddGameToSteamResult> {
  let gameInfo = game.getGameInfo()
  const runner = gameInfo.runner
  const appName = gameInfo.app_name

  const known = findShortcut(appName)
  if (known) {
    logInfo(
      `"${gameInfo.title}" (${appName}) is already tracked in Steam (ID ${known.steamAppId}). Skipping.`,
      LOG_PREFIX
    )
    return {
      success: true,
      steamAppId: known.steamAppId
    }
  }

  if (!installPath) {
    try {
      const freshInfo = (
        libraryManagerMap[
          runner as keyof typeof libraryManagerMap
        ] as unknown as {
          getGameInfo?: (appName: string, forceReload: boolean) => GameInfo | undefined
        }
      ).getGameInfo?.(appName, true)
      if (freshInfo) {
        gameInfo = freshInfo
      }
    } catch (e) {
      logError(
        `Failed to refresh game info for ${runner}: ${e}`,
        LOG_PREFIX
      )
    }

    installPath = gameInfo.install.install_path ?? ''
  }

  logInfo(
    `Adding "${gameInfo.title}" to Steam at ${installPath}`,
    LOG_PREFIX
  )

  const batPath = createRelicBat(
    installPath,
    gameInfo.title,
    gameInfo.runner as GameRunner,
    gameInfo.app_name
  )

  const result = await addGameToSteam({
    gameName: gameInfo.title
  })

  if (result.success && result.steamAppId) {
    addShortcut(appName, result.steamAppId, batPath, installPath)
  }

  return result
}

export async function onGameUninstalled(game: Game) {
  const gameInfo = game.getGameInfo()
  const appName = gameInfo.app_name

  const known = findShortcut(appName)
  if (known?.batPath) {
    try {
      if (existsSync(known.batPath)) {
        unlinkSync(known.batPath)
        logInfo(`Deleted ${known.batPath}`, LOG_PREFIX)
      }
    } catch (e) {
      logError(`Failed to delete ${known.batPath}: ${e}`, LOG_PREFIX)
    }
  }

  removeShortcut(appName)
  logInfo(`Removing ${gameInfo.title} from Steam shortcuts`, LOG_PREFIX)
  await removeNonSteamGame(game)
}
