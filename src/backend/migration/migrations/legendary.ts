import { access, cp, mkdir } from 'fs/promises'
import { join } from 'path'

import { appDataPath } from 'backend/constants/paths'
import { legendaryConfigPath } from 'backend/storeManagers/legendary/constants'

import type { PathLike } from 'fs'
import type { Migration } from '..'

const exists = async (path: PathLike) =>
  access(path).then(
    () => true,
    () => false
  )

export class LegendaryGlobalConfigFolderMigration implements Migration {
  identifier = 'legendary-move-global-config-folder'
  async run(): Promise<boolean> {
    const hasRelicSpecificConfig = await exists(legendaryConfigPath)
    // Don't overwrite existing configuration
    if (hasRelicSpecificConfig) return true

    const globalLegendaryConfig = join(appDataPath, 'legendary')

    const hasGlobalConfig = await exists(globalLegendaryConfig)
    // Nothing to migrate
    if (!hasGlobalConfig) return true

    await mkdir(legendaryConfigPath, { recursive: true })
    await cp(globalLegendaryConfig, legendaryConfigPath, { recursive: true })
    return true
  }
}
