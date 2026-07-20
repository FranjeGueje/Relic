import { existsSync, unlinkSync } from 'graceful-fs'
import { join } from 'path'
import { logInfo, logError } from 'backend/logger'
import { getUserdataInfo } from '../steam_shortcuts/steam_helpers'

const LOG_PREFIX = 'Relic'

const GRID_FILES = [
  (id: number) => `${id}.png`,
  (id: number) => `${id}p.png`,
  (id: number) => `${id}_hero.png`,
  (id: number) => `${id}_logo.png`,
  (id: number) => `${id}_icon.ico`
]

export function deleteGrids(steamAppId: number): void {
  const { userdataDir, folders } = getUserdataInfo()
  if (folders.length === 0) return

  for (const folder of folders) {
    const gridFolder = join(userdataDir, folder, 'config', 'grid')
    for (const getFileName of GRID_FILES) {
      const filePath = join(gridFolder, getFileName(steamAppId))
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath)
          logInfo(`Deleted grid file: ${filePath}`, LOG_PREFIX)
        }
      } catch (e) {
        logError(`Failed to delete grid file ${filePath}: ${e}`, LOG_PREFIX)
      }
    }
  }
}
