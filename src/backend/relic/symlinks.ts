import { existsSync, unlinkSync } from 'graceful-fs'
import { symlinkSync } from 'graceful-fs'
import { join } from 'path'
import { logInfo, logError } from 'backend/logger'
import { relicMountPath, relicInstallPath } from 'backend/constants/paths'

const LOG_PREFIX = 'Relic'

export function createRelicSymlinks(linksPath: string): void {
  const relicLink = join(linksPath, 'relic')
  const gamesLink = join(linksPath, 'games')

  try {
    if (existsSync(relicLink)) unlinkSync(relicLink)
    if (existsSync(gamesLink)) unlinkSync(gamesLink)

    symlinkSync(relicMountPath, relicLink)
    symlinkSync(relicInstallPath, gamesLink)

    logInfo(`Created symlinks in ${linksPath}`, LOG_PREFIX)
  } catch (error) {
    logError(`Failed to create symlinks in ${linksPath}: ${error}`, LOG_PREFIX)
    throw error
  }
}
