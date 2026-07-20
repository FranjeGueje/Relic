import { mkdirSync, symlinkSync } from 'graceful-fs'
import { join } from 'path'
import { logInfo, logError } from 'backend/logger'
import { relicMountPath, relicGamesPath } from 'backend/constants/paths'
import { getSteamPath } from './steam_shortcuts/steam_helpers'
import { GameInfo } from 'common/types'

const LOG_PREFIX = 'Relic'

export function preparePrefix(steamAppId: number): void {
  try {
    const steamPath = getSteamPath()
    const driveC = join(
      steamPath, 'steamapps', 'compatdata',
      String(steamAppId), 'pfx', 'drive_c'
    )

    mkdirSync(driveC, { recursive: true })

    symlinkSync(relicMountPath, join(driveC, 'relic'))
    symlinkSync(relicGamesPath, join(driveC, 'games'))

    logInfo(`Prefijo creado para Steam ID ${steamAppId}`, LOG_PREFIX)
  } catch (error) {
    logError(`Failed to prepare prefix for Steam ID ${steamAppId}: ${error}`, LOG_PREFIX)
  }
}

export function prepareUmuPrefix(gameInfo: GameInfo): void {
  // TODO: Crear prefijo con umu-launcher
}
