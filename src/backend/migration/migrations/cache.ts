import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from 'fs'
import { dirname, join } from 'path'

import {
  appFolder,
  imagesCachePath,
  storeCachePath,
  userDataPath
} from 'backend/constants/paths'

import type { Migration } from '..'

export class MoveCacheToXdgMigration implements Migration {
  identifier = 'move-cache-to-xdg-cache'

  async run(): Promise<boolean> {
    const moves: Array<[string, string]> = [
      [join(userDataPath, 'store_cache'), storeCachePath],
      [join(appFolder, 'images-cache'), imagesCachePath]
    ]

    for (const [from, to] of moves) {
      if (!existsSync(from)) continue
      if (existsSync(to)) {
        // The new code already wrote here: the old copy is stale.
        rmSync(from, { recursive: true, force: true })
        continue
      }
      mkdirSync(dirname(to), { recursive: true })
      try {
        renameSync(from, to)
      } catch {
        // e.g. XDG_CACHE_HOME on another filesystem (EXDEV)
        cpSync(from, to, { recursive: true })
        rmSync(from, { recursive: true, force: true })
      }
    }
    return true
  }
}
