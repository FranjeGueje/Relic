import { rm } from 'fs/promises'
import { join } from 'path'

import { toolsPath } from 'backend/constants/paths'

import type { Migration } from '..'

export class RemoveGogRedistMigration implements Migration {
  identifier = 'remove-gog-redist'

  async run(): Promise<boolean> {
    // Galaxy Common Redistributables support was removed: drop leftover downloads
    await rm(join(toolsPath, 'redist', 'gog'), { recursive: true, force: true })
    return true
  }
}
