import { existsSync, mkdirSync, rmSync, symlinkSync, unlinkSync } from 'graceful-fs'
import { dirname, join } from 'path'
import { logInfo, logError } from 'backend/logger'
import { relicMountPath, relicGamesPath } from 'backend/constants/paths'
import { getSteamPath } from './steam_shortcuts/steam_helpers'
import { GlobalConfig } from 'backend/config'
import { getUmuStoreLabel, searchUmuGameId, launchUmu } from './umu'
import { windowify } from './windowify'
import { GameInfo } from 'common/types'

const LOG_PREFIX = 'Relic'

export async function preparePrefix(
  gameInfo: GameInfo,
  steamAppId: number,
  installPath: string
): Promise<void> {
  if (gameInfo.runner === 'zoom') {
    symlinkPrefix(steamAppId, installPath)
  } else {
    windowify(gameInfo, installPath)
    await prepareUmuPrefix(gameInfo, installPath, steamAppId)
  }
}

export function symlinkPrefix(steamAppId: number, installPath: string): void {
  try {
    const steamPath = getSteamPath()
    const compatPath = join(steamPath, 'steamapps', 'compatdata', String(steamAppId))

    mkdirSync(dirname(compatPath), { recursive: true })

    if (existsSync(compatPath)) {
      rmSync(compatPath, { recursive: true, force: true })
    }

    symlinkSync(installPath, compatPath)
    logInfo(`Prefix symlinked: ${compatPath} → ${installPath}`, LOG_PREFIX)
  } catch (error) {
    logError(`Failed to symlink prefix for Steam ID ${steamAppId}: ${error}`, LOG_PREFIX)
  }
}

export function removePrefixSymlink(steamAppId: number): void {
  try {
    const steamPath = getSteamPath()
    const compatPath = join(steamPath, 'steamapps', 'compatdata', String(steamAppId))

    if (existsSync(compatPath)) {
      unlinkSync(compatPath)
      logInfo(`Removed prefix symlink ${compatPath}`, LOG_PREFIX)
    }
  } catch (error) {
    logError(`Failed to remove prefix symlink for Steam ID ${steamAppId}: ${error}`, LOG_PREFIX)
  }
}

export async function prepareUmuPrefix(
  gameInfo: GameInfo,
  installPath: string,
  steamAppId: number
): Promise<void> {
  const steamPath = getSteamPath()

  try {
    const driveC = join(
      steamPath, 'steamapps', 'compatdata',
      String(steamAppId), 'drive_c'
    )

    mkdirSync(driveC, { recursive: true })

    symlinkSync(relicMountPath, join(driveC, 'relic'))
    symlinkSync(relicGamesPath, join(driveC, 'games'))

    const epicDataDir = join(
      driveC,
      'ProgramData',
      'Epic',
      'EpicGamesLauncher',
      'Data'
    )
    mkdirSync(epicDataDir, { recursive: true })
    symlinkSync(
      join('..', '..', '..', '..', 'relic', 'legendary', 'manifests'),
      join(epicDataDir, 'manifests')
    )

    logInfo(`Prefix created for Steam ID ${steamAppId}`, LOG_PREFIX)
  } catch (error) {
    logError(`Failed to prepare prefix for Steam ID ${steamAppId}: ${error}`, LOG_PREFIX)
    return
  }

  const protonPath = GlobalConfig.get().getSettings().protonPath
  if (!protonPath) {
    logInfo('No GE-Proton configured, skipping UMU prefix', LOG_PREFIX)
    return
  }

  const storeLabel = getUmuStoreLabel(gameInfo.runner)
  if (!storeLabel) {
    logInfo(`Runner "${gameInfo.runner}" has no UMU store mapping, skipping`, LOG_PREFIX)
    return
  }

  const umuId = await searchUmuGameId(storeLabel, gameInfo.app_name)
  const gameId = umuId ?? '0'

  const winePrefix = join(
    steamPath, 'steamapps', 'compatdata',
    String(steamAppId)
  )

  const result = await launchUmu({
    winePrefix,
    gameId,
    protonPath,
    store: storeLabel,
    executable: 'exit'
  })

  if (result.success) {
    logInfo(`UMU prefix prepared for "${gameInfo.title}" (GAMEID=${gameId})`, LOG_PREFIX)
  } else {
    logInfo(`UMU prefix failed for "${gameInfo.title}": ${result.error}`, LOG_PREFIX)
  }
}
