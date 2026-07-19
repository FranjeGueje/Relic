import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, unlinkSync, symlinkSync, writeFileSync } from 'graceful-fs'
import { basename, join } from 'path'
import { logError, logInfo, logWarning } from 'backend/logger'
import { relicMountPath, relicInstallPath, relicGamesPath, userDataPath } from 'backend/constants/paths'
import { legendaryInstalled } from 'backend/storeManagers/legendary/constants'
import { nileInstalled } from 'backend/storeManagers/nile/constants'
import { gogdlConfigPath, gogdlAuthConfig } from 'backend/storeManagers/gog/constants'
import { GameInfo } from 'common/types'
import type { GameRunner } from './steam_shortcuts/types'

const LOG_PREFIX = 'Relic'

const STORE_CONFIGS: Record<GameRunner, {
  source: string
  mountDir: string
  transform: (data: unknown) => unknown
}> = {
  legendary: {
    source: legendaryInstalled,
    mountDir: 'legendary',
    transform: (data: unknown) => {
      if (!Array.isArray(data)) return data
      return data.map((entry: Record<string, unknown>) => ({
        ...entry,
        install_path: `c:\\games\\${basename(entry.install_path as string)}`
      }))
    }
  },
  gog: {
    source: join(userDataPath, 'gog_store', 'installed.json'),
    mountDir: 'gog_store',
    transform: (data: unknown) => {
      const obj = data as Record<string, unknown>
      if (!obj.installed || !Array.isArray(obj.installed)) return data
      return {
        ...obj,
        installed: obj.installed.map((entry: Record<string, unknown>) => ({
          ...entry,
          install_path: `c:\\games\\${basename(entry.install_path as string)}`
        }))
      }
    }
  },
  nile: {
    source: nileInstalled,
    mountDir: 'nile',
    transform: (data: unknown) => {
      if (!Array.isArray(data)) return data
      return data.map((entry: Record<string, unknown>) => ({
        ...entry,
        path: `c:\\games\\${basename(entry.path as string)}`
      }))
    }
  },
  sideload: { source: '', mountDir: '', transform: (d) => d },
  zoom: { source: '', mountDir: '', transform: (d) => d }
}

function ensureMountDirs(): void {
  for (const config of Object.values(STORE_CONFIGS)) {
    if (config.mountDir) {
      mkdirSync(join(relicMountPath, config.mountDir), { recursive: true })
    }
  }
  mkdirSync(join(relicMountPath, 'gogdl'), { recursive: true })
  mkdirSync(join(relicMountPath, 'heroic_gogdl'), { recursive: true })
}

function createGameSymlink(gameInfo: GameInfo): void {
  const installPath = gameInfo.install.install_path
  if (!installPath) {
    logWarning(`No install path for "${gameInfo.title}", skipping symlink`, LOG_PREFIX)
    return
  }

  const linkPath = join(relicGamesPath, gameInfo.title)

  try {
    if (existsSync(linkPath)) {
      unlinkSync(linkPath)
    }
    mkdirSync(relicGamesPath, { recursive: true })
    symlinkSync(installPath, linkPath)
    logInfo(`Created symlink: ${linkPath} → ${installPath}`, LOG_PREFIX)
  } catch (error) {
    logError(`Failed to create symlink ${linkPath}: ${error}`, LOG_PREFIX)
  }
}

function copyGogAuth(): void {
  const source = gogdlAuthConfig
  const target = join(relicMountPath, 'gog_store', 'auth.json')
  if (!existsSync(source)) return
  try {
    copyFileSync(source, target)
    logInfo(`Copied GOG auth to mount`, LOG_PREFIX)
  } catch (error) {
    logWarning(`Failed to copy GOG auth: ${error}`, LOG_PREFIX)
  }
}

function copyGogConfig(): void {
  if (!existsSync(gogdlConfigPath)) return
  try {
    const gogdlTarget = join(relicMountPath, 'gogdl')
    const heroicTarget = join(relicMountPath, 'heroic_gogdl')
    cpSync(gogdlConfigPath, gogdlTarget, { recursive: true })
    cpSync(gogdlConfigPath, heroicTarget, { recursive: true })
    logInfo(`Copied GOG config to mount/gogdl and mount/heroic_gogdl`, LOG_PREFIX)
  } catch (error) {
    logWarning(`Failed to copy GOG config: ${error}`, LOG_PREFIX)
  }
}

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

function copyAndTransformInstalled(
  sourcePath: string,
  targetPath: string,
  transform: (data: unknown) => unknown
): void {
  const content = readFileSync(sourcePath, 'utf-8')
  const data = JSON.parse(content)
  const transformed = transform(data)
  writeFileSync(targetPath, JSON.stringify(transformed, null, 2), 'utf-8')
  logInfo(`Windowified ${sourcePath} → ${targetPath}`, LOG_PREFIX)
}

export function windowify(gameInfo: GameInfo): void {
  ensureMountDirs()
  createGameSymlink(gameInfo)
  copyGogAuth()
  copyGogConfig()

  const config = STORE_CONFIGS[gameInfo.runner as GameRunner]
  if (!config || !config.source) {
    logWarning(`windowify not implemented for runner: ${gameInfo.runner}`, LOG_PREFIX)
    return
  }

  try {
    if (!existsSync(config.source)) {
      logWarning(`No installed.json found at ${config.source}`, LOG_PREFIX)
      return
    }

    copyAndTransformInstalled(
      config.source,
      join(relicMountPath, config.mountDir, 'installed.json'),
      config.transform
    )
  } catch (error) {
    logError(`Failed to windowify: ${error}`, LOG_PREFIX)
  }
}
