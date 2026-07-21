import { existsSync, mkdirSync, rmSync, symlinkSync, unlinkSync } from 'graceful-fs'
import { dirname, join } from 'path'
import { logInfo, logError } from 'backend/logger'
import { relicMountPath, relicGamesPath } from 'backend/constants/paths'
import { getSteamPath } from './steam_shortcuts/steam_helpers'
import { findShortcut } from './steam_shortcuts'
import { GlobalConfig } from 'backend/config'
import { getUmuStoreLabel, searchUmuGameId, launchUmu } from './umu'
import { GameInfo } from 'common/types'

const LOG_PREFIX = 'Relic'

export function preparePrefix(steamAppId: number): void {
  try {
    const steamPath = getSteamPath()
    const driveC = join(
      steamPath, 'steamapps', 'compatdata',
      String(steamAppId), 'drive_c'
    )

    mkdirSync(driveC, { recursive: true })

    symlinkSync(relicMountPath, join(driveC, 'relic'))
    symlinkSync(relicGamesPath, join(driveC, 'games'))

    logInfo(`Prefijo creado para Steam ID ${steamAppId}`, LOG_PREFIX)
  } catch (error) {
    logError(`Failed to prepare prefix for Steam ID ${steamAppId}: ${error}`, LOG_PREFIX)
  }
}

export async function prepareUmuPrefix(
  gameInfo: GameInfo,
  installPath: string
): Promise<void> {
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

  const known = findShortcut(gameInfo.app_name)
  if (!known?.steamAppId) {
    logError('No steamAppId found for UMU prefix', LOG_PREFIX)
    return
  }

  const steamPath = getSteamPath()
  const winePrefix = join(
    steamPath, 'steamapps', 'compatdata',
    String(known.steamAppId)
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
