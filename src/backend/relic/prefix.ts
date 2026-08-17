import { existsSync, mkdirSync, rmSync, symlinkSync, unlinkSync } from 'fs'
import { dirname, join } from 'path'
import { logInfo, logError, logWarning } from 'backend/logger'
import { relicMountPath, relicGamesPath } from 'backend/constants/paths'
import { getSteamPath } from './steam_shortcuts/steam_helpers'
import { createGameSymlink } from './steam_shortcuts/add_game'
import { GlobalConfig } from 'backend/config'
import { getUmuStoreLabel, searchUmuGameId, launchUmu } from './umu'
import { windowify, EOS_OVERLAY_BAT } from './windowify'
import { GameInfo } from 'common/types'

const LOG_PREFIX = 'Relic'

export async function preparePrefix(
  gameInfo: GameInfo,
  steamAppId: number,
  installPath: string
): Promise<void> {
  if (gameInfo.runner === 'zoom') {
    const symlink = createGameSymlink(installPath)
    if ('error' in symlink) {
      logError(`Failed to prepare Zoom prefix: ${symlink.error}`, LOG_PREFIX)
      return
    }
    symlinkPrefix(steamAppId, symlink.linkPath)
  } else {
    windowify(gameInfo, installPath)
    await prepareUmuPrefix(gameInfo, installPath, steamAppId)
  }
}

export function symlinkPrefix(
  steamAppId: number,
  installPath: string
): boolean {
  try {
    const steamPath = getSteamPath()
    const compatPath = join(
      steamPath,
      'steamapps',
      'compatdata',
      String(steamAppId)
    )

    mkdirSync(dirname(compatPath), { recursive: true })

    if (existsSync(compatPath)) {
      rmSync(compatPath, { recursive: true, force: true })
    }

    symlinkSync(installPath, compatPath)
    logInfo(`Prefix symlinked: ${compatPath} → ${installPath}`, LOG_PREFIX)
    return true
  } catch (error) {
    logError(
      `Failed to symlink prefix for Steam ID ${steamAppId}: ${error}`,
      LOG_PREFIX
    )
    return false
  }
}

export function removePrefixSymlink(steamAppId: number): void {
  try {
    const steamPath = getSteamPath()
    const compatPath = join(
      steamPath,
      'steamapps',
      'compatdata',
      String(steamAppId)
    )

    if (existsSync(compatPath)) {
      unlinkSync(compatPath)
      logInfo(`Removed prefix symlink ${compatPath}`, LOG_PREFIX)
    }
  } catch (error) {
    logError(
      `Failed to remove prefix symlink for Steam ID ${steamAppId}: ${error}`,
      LOG_PREFIX
    )
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
      steamPath,
      'steamapps',
      'compatdata',
      String(steamAppId),
      'drive_c'
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
    logError(
      `Failed to prepare prefix for Steam ID ${steamAppId}: ${error}`,
      LOG_PREFIX
    )
    return
  }

  const protonPath = GlobalConfig.get().getSettings().protonPath
  if (!protonPath) {
    logInfo('No GE-Proton configured, skipping UMU prefix', LOG_PREFIX)
    return
  }

  const storeLabel = getUmuStoreLabel(gameInfo.runner)
  if (!storeLabel) {
    logInfo(
      `Runner "${gameInfo.runner}" has no UMU store mapping, skipping`,
      LOG_PREFIX
    )
    return
  }

  const umuId = await searchUmuGameId(storeLabel, gameInfo.app_name)
  const gameId = umuId ?? '0'

  const winePrefix = join(
    steamPath,
    'steamapps',
    'compatdata',
    String(steamAppId)
  )

  // `exit` is not a real executable: it is a deliberate trick to make proton
  // initialise the prefix and quit right away, used for every store. umu warns
  // ("Executable not found: exit") and returns 1 even when the prefix was
  // created just fine, so this exit code says nothing about whether it worked —
  // never gate anything on it.
  const result = await launchUmu({
    winePrefix,
    gameId,
    protonPath,
    store: storeLabel,
    executable: 'exit'
  })

  logInfo(
    `UMU prefix prepared for "${gameInfo.title}" (GAMEID=${gameId})` +
      (result.success ? '' : `; umu output: ${result.error}`),
    LOG_PREFIX
  )

  await installEosOverlay(gameInfo, {
    winePrefix,
    gameId,
    protonPath,
    store: storeLabel
  })
}

/**
 * Installs the EOS Overlay into a freshly created prefix. Epic-only, and never
 * fatal: a failing overlay must not keep the game from reaching Steam.
 */
async function installEosOverlay(
  gameInfo: GameInfo,
  umuOptions: {
    winePrefix: string
    gameId: string
    protonPath: string
    store: string
  }
): Promise<void> {
  if (gameInfo.runner !== 'legendary') return

  const batPath = join(relicMountPath, EOS_OVERLAY_BAT)
  if (!existsSync(batPath)) {
    logWarning(
      `EOS Overlay script not found at ${batPath}, skipping overlay setup`,
      LOG_PREFIX
    )
    return
  }

  const result = await launchUmu({ ...umuOptions, executable: batPath })

  if (result.success) {
    logInfo(`EOS Overlay set up for "${gameInfo.title}"`, LOG_PREFIX)
  } else {
    logWarning(
      `EOS Overlay setup failed for "${gameInfo.title}": ${result.error}`,
      LOG_PREFIX
    )
  }
}
