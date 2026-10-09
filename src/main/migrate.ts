import {
  cpSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { homedir, hostname } from 'node:os'
import { isAbsolute, join } from 'node:path'

/** The roots the old Relic (the Heroic-based desktop app) and rakun keep their files in */
export type MigrationDirs = {
  /** `~/.config` */
  config: string
  /** `~/.local/share` */
  data: string
}

/** Left in `~/.config/relic` when it could not be deleted after the migration */
export const MIGRATED_FLAG = '.migrated'

/** What of `~/.config/relic` rakun uses; the rest (`store/`, `GamesConfig`, caches…) stays behind */
export const COPIED_ENTRIES = [
  'gogdlConfig',
  'nile_config',
  'nile_store',
  'gog_store',
  'legendaryConfig',
  'zoom_store',
  'steam_shortcuts.json'
] as const

/** The settings of the old `config.json` that rakun has too */
export const KEPT_SETTINGS = [
  'language',
  'defaultInstallPath',
  'protonPath',
  'steamGridDbApiKey',
  'autoUpdateGames',
  'maxWorkers',
  'defaultSteamPath'
] as const

export function migrationDirs(
  env: NodeJS.ProcessEnv,
  home = homedir()
): MigrationDirs {
  const absolute = (value: string | undefined, fallback: string) =>
    value && isAbsolute(value) ? value : join(home, fallback)
  return {
    config: absolute(env.XDG_CONFIG_HOME, '.config'),
    data: absolute(env.XDG_DATA_HOME, '.local/share')
  }
}

/** The old `config.json` with only the settings rakun knows (it would mix the others into its own) */
export function filterSettings(json: unknown): {
  defaultSettings: Record<string, unknown>
  version: string
} {
  const parsed = (json && typeof json === 'object' ? json : {}) as {
    defaultSettings?: Record<string, unknown>
    version?: unknown
  }
  const source =
    parsed.defaultSettings && typeof parsed.defaultSettings === 'object'
      ? parsed.defaultSettings
      : {}
  const defaultSettings: Record<string, unknown> = {}
  for (const key of KEPT_SETTINGS)
    if (key in source) defaultSettings[key] = source[key]
  return {
    defaultSettings,
    version: typeof parsed.version === 'string' ? parsed.version : 'v0'
  }
}

/** `lstat` that says what is there without following a link; undefined when nothing is */
function lstatOf(path: string) {
  try {
    return lstatSync(path)
  } catch {
    return undefined
  }
}

const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/** The old Relic is open: Chromium's `SingletonLock` is a link to `<host>-<pid>` */
function oldRelicRunning(
  oldConfig: string,
  alive: (pid: number) => boolean
): boolean {
  let target: string
  try {
    target = readlinkSync(join(oldConfig, 'SingletonLock'))
  } catch {
    return false
  }
  const match = /^(.*)-(\d+)$/.exec(target)
  return !!match && match[1] === hostname() && alive(Number(match[2]))
}

/**
 * Only the first time rakun is about to exist: the old configuration is there, it was not
 * migrated, rakun has no folder of its own yet and the old Relic is not open.
 */
export function shouldMigrate(
  dirs: MigrationDirs,
  alive: (pid: number) => boolean = isAlive
): boolean {
  const oldConfig = join(dirs.config, 'relic')
  return (
    !!lstatOf(oldConfig)?.isDirectory() &&
    !lstatOf(join(oldConfig, MIGRATED_FLAG)) &&
    !lstatOf(join(dirs.config, 'rakun')) &&
    !oldRelicRunning(oldConfig, alive)
  )
}

/**
 * Points every link under `root` that went to `from` to `to`, keeping the rest of the path.
 * A new link is made beside and renamed over the old one, so nothing is ever without it.
 */
export function retargetLinks(root: string, from: string, to: string): number {
  let changed = 0
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) {
      changed += retargetLinks(path, from, to)
    } else if (entry.isSymbolicLink()) {
      const target = readlinkSync(path)
      if (target !== from && !target.startsWith(`${from}/`)) continue
      const temporary = `${path}.relic-link`
      rmSync(temporary, { force: true })
      symlinkSync(to + target.slice(from.length), temporary)
      renameSync(temporary, path)
      changed++
    }
  }
  return changed
}

/**
 * `~/.local/share/relic` becomes `~/.local/share/rakun`, and a link keeps the old name working
 * (the Steam shortcuts run `…/share/relic/runner/<game>.bat`, and the Proton prefixes have
 * `drive_c/relic`). Its links into `~/.config/relic` are pointed to rakun's folder.
 */
function moveData(dirs: MigrationDirs) {
  const oldData = join(dirs.data, 'relic')
  const newData = join(dirs.data, 'rakun')
  const old = lstatOf(oldData)
  if (old?.isDirectory() && !lstatOf(newData)) {
    renameSync(oldData, newData)
    symlinkSync(newData, oldData)
  } else if (old?.isDirectory()) {
    throw new Error(`${newData} already exists next to ${oldData}`)
  }
  const mount = join(newData, 'mount')
  if (lstatOf(mount)?.isDirectory())
    retargetLinks(mount, join(dirs.config, 'relic'), join(dirs.config, 'rakun'))
}

/** Builds `~/.config/rakun` beside and renames it into place: the last thing, since it ends the need to migrate */
function copyConfig(dirs: MigrationDirs) {
  const oldConfig = join(dirs.config, 'relic')
  const staging = join(dirs.config, `rakun.tmp-${process.pid}`)
  rmSync(staging, { recursive: true, force: true })
  mkdirSync(staging, { recursive: true })
  for (const name of COPIED_ENTRIES)
    if (lstatOf(join(oldConfig, name)))
      cpSync(join(oldConfig, name), join(staging, name), {
        recursive: true,
        verbatimSymlinks: true
      })
  try {
    const json: unknown = JSON.parse(
      readFileSync(join(oldConfig, 'config.json'), 'utf-8')
    )
    writeFileSync(
      join(staging, 'config.json'),
      JSON.stringify(filterSettings(json), null, 2)
    )
  } catch {
    // no readable settings: rakun starts with its own
  }
  renameSync(staging, join(dirs.config, 'rakun'))
}

/** The copy has everything the old folder had of what rakun uses */
function copyIsComplete(dirs: MigrationDirs): boolean {
  return [...COPIED_ENTRIES, 'config.json'].every(
    (name) =>
      !lstatOf(join(dirs.config, 'relic', name)) ||
      !!lstatOf(join(dirs.config, 'rakun', name))
  )
}

export type MigrationResult = 'not-needed' | 'done' | 'failed'

/**
 * Brings the old Relic's files to where rakun looks, before rakun exists, so it starts already
 * migrated (sessions, installed games and library included). Every step can be repeated: if one
 * fails, the next start picks up. `~/.config/relic` is deleted only once the copy is checked.
 */
export function migrateFromOldRelic(
  dirs: MigrationDirs,
  log: (...args: unknown[]) => void = console.warn,
  alive?: (pid: number) => boolean
): MigrationResult {
  if (!shouldMigrate(dirs, alive)) return 'not-needed'
  try {
    moveData(dirs)
    copyConfig(dirs)
    const oldConfig = join(dirs.config, 'relic')
    if (!copyIsComplete(dirs)) throw new Error('the copy is not complete')
    try {
      rmSync(oldConfig, { recursive: true, force: true })
    } catch (error) {
      log('migration: could not delete', oldConfig, error)
      writeFileSync(join(oldConfig, MIGRATED_FLAG), '')
    }
    return 'done'
  } catch (error) {
    log('migration from the old Relic failed:', error)
    return 'failed'
  }
}
