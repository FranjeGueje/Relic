import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { hostname, tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test, vi } from 'vitest'
import {
  MIGRATED_FLAG,
  filterSettings,
  migrateFromOldRelic,
  migrationDirs,
  removeLegacyData,
  retargetLinks,
  shouldMigrate,
  type MigrationDirs
} from '../migrate'

/** A home with the old Relic's files: config, store sessions, and a share folder with its links */
function oldHome() {
  const root = mkdtempSync(join(tmpdir(), 'rc-migrate-'))
  const dirs: MigrationDirs = {
    config: join(root, 'config'),
    data: join(root, 'share')
  }
  const oldConfig = join(dirs.config, 'relic')
  const oldData = join(dirs.data, 'relic')
  for (const dir of [
    join(oldConfig, 'legendaryConfig', 'legendary'),
    join(oldConfig, 'gog_store'),
    join(oldConfig, 'store'),
    join(oldConfig, 'Cache'),
    join(oldData, 'mount', 'legendary'),
    join(oldData, 'runner'),
    join(oldData, 'games')
  ])
    mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(oldConfig, 'legendaryConfig', 'legendary', 'user.json'),
    'u'
  )
  writeFileSync(join(oldConfig, 'gog_store', 'auth.json'), 'a')
  writeFileSync(join(oldConfig, 'store', 'config.json'), 'front')
  writeFileSync(join(oldConfig, 'steam_shortcuts.json'), '[{"execPath":"old"}]')
  writeFileSync(
    join(oldConfig, 'config.json'),
    JSON.stringify({
      defaultSettings: { language: 'es', protonPath: '/p', verboseLogs: true },
      version: 'v0'
    })
  )
  writeFileSync(join(oldData, 'runner', 'Game.bat'), 'bat')
  symlinkSync(
    join(oldConfig, 'legendaryConfig', 'legendary', 'user.json'),
    join(oldData, 'mount', 'legendary', 'user.json')
  )
  symlinkSync('/somewhere/Games/G', join(oldData, 'games', 'G'))
  return { root, dirs, oldConfig, oldData }
}

const quiet = () => undefined

const lstatOf = (path: string) => {
  try {
    return lstatSync(path)
  } catch {
    return undefined
  }
}

describe('migrationDirs', () => {
  test('follows XDG when absolute, else the home folder', () => {
    expect(migrationDirs({}, '/h')).toEqual({
      config: '/h/.config',
      data: '/h/.local/share'
    })
    expect(
      migrationDirs({ XDG_CONFIG_HOME: '/c', XDG_DATA_HOME: 'relative' }, '/h')
    ).toEqual({ config: '/c', data: '/h/.local/share' })
  })
})

describe('filterSettings', () => {
  test('keeps only the settings rakun has', () => {
    expect(
      filterSettings({
        defaultSettings: {
          language: 'es',
          maxWorkers: 0,
          verboseLogs: true,
          disableGOGPresence: false
        },
        version: 'v0'
      })
    ).toEqual({
      defaultSettings: { language: 'es', maxWorkers: 0 },
      version: 'v0'
    })
  })

  test('survives a missing or broken file', () => {
    expect(filterSettings(undefined)).toEqual({
      defaultSettings: {},
      version: 'v0'
    })
    expect(filterSettings({ defaultSettings: 3 })).toEqual({
      defaultSettings: {},
      version: 'v0'
    })
  })
})

describe('shouldMigrate', () => {
  test('only with the old folder, no flag, no rakun folder and the old Relic closed', () => {
    const { dirs, oldConfig } = oldHome()
    expect(shouldMigrate(dirs)).toBe(true)

    writeFileSync(join(oldConfig, MIGRATED_FLAG), '')
    expect(shouldMigrate(dirs)).toBe(false)
  })

  test('not without the old folder, nor with a rakun folder', () => {
    const { dirs } = oldHome()
    mkdirSync(join(dirs.config, 'rakun'))
    expect(shouldMigrate(dirs)).toBe(false)
    expect(shouldMigrate({ ...dirs, config: join(dirs.config, 'nope') })).toBe(
      false
    )
  })

  test('not while the old Relic is open, yes when its lock is stale', () => {
    const { dirs, oldConfig } = oldHome()
    symlinkSync(`${hostname()}-4242`, join(oldConfig, 'SingletonLock'))

    expect(shouldMigrate(dirs, () => true)).toBe(false)
    expect(shouldMigrate(dirs, () => false)).toBe(true)
  })
})

describe('retargetLinks', () => {
  test('points the links into one folder to another, keeping the rest', () => {
    const { root } = oldHome()
    const dir = join(root, 'links')
    mkdirSync(join(dir, 'sub'), { recursive: true })
    symlinkSync('/a/old/x.json', join(dir, 'sub', 'x.json'))
    symlinkSync('/a/old', join(dir, 'whole'))
    symlinkSync('/a/older/y', join(dir, 'other'))

    expect(retargetLinks(dir, '/a/old', '/a/new')).toBe(2)
    expect(readlinkSync(join(dir, 'sub', 'x.json'))).toBe('/a/new/x.json')
    expect(readlinkSync(join(dir, 'whole'))).toBe('/a/new')
    expect(readlinkSync(join(dir, 'other'))).toBe('/a/older/y')
  })
})

describe('migrateFromOldRelic', () => {
  test('moves the share folder, copies the config and deletes the old one', () => {
    const { dirs, oldConfig, oldData } = oldHome()

    expect(migrateFromOldRelic(dirs, quiet)).toBe('done')

    const newData = join(dirs.data, 'rakun')
    expect(readlinkSync(oldData)).toBe(newData)
    expect(readFileSync(join(oldData, 'runner', 'Game.bat'), 'utf-8')).toBe(
      'bat'
    )
    expect(readlinkSync(join(newData, 'mount', 'legendary', 'user.json'))).toBe(
      join(dirs.config, 'rakun', 'legendaryConfig', 'legendary', 'user.json')
    )
    expect(readlinkSync(join(newData, 'games', 'G'))).toBe('/somewhere/Games/G')

    const config = join(dirs.config, 'rakun')
    expect(readFileSync(join(config, 'gog_store', 'auth.json'), 'utf-8')).toBe(
      'a'
    )
    expect(
      readFileSync(
        join(config, 'legendaryConfig', 'legendary', 'user.json'),
        'utf-8'
      )
    ).toBe('u')
    expect(readFileSync(join(config, 'steam_shortcuts.json'), 'utf-8')).toBe(
      '[{"execPath":"old"}]'
    )
    expect(
      JSON.parse(readFileSync(join(config, 'config.json'), 'utf-8'))
    ).toEqual({
      defaultSettings: { language: 'es', protonPath: '/p' },
      version: 'v0'
    })
    expect(existsSync(join(config, 'store'))).toBe(false)
    expect(existsSync(join(config, 'Cache'))).toBe(false)
    expect(existsSync(oldConfig)).toBe(false)
    expect(readdirSync(dirs.config)).toEqual(['rakun'])
  })

  test('does nothing a second time', () => {
    const { dirs } = oldHome()
    migrateFromOldRelic(dirs, quiet)
    expect(migrateFromOldRelic(dirs, quiet)).toBe('not-needed')
  })

  test('touches nothing when it should not run', () => {
    const { dirs, oldConfig, oldData } = oldHome()
    mkdirSync(join(dirs.config, 'rakun'))

    expect(migrateFromOldRelic(dirs, quiet)).toBe('not-needed')
    expect(existsSync(oldConfig)).toBe(true)
    expect(lstatSync(oldData).isDirectory()).toBe(true)
  })

  test("keeps the old config and does not make rakun's when the share folder cannot move", () => {
    const { dirs, oldConfig } = oldHome()
    mkdirSync(join(dirs.data, 'rakun'))
    const log = vi.fn()

    expect(migrateFromOldRelic(dirs, log)).toBe('failed')
    expect(existsSync(oldConfig)).toBe(true)
    expect(existsSync(join(dirs.config, 'rakun'))).toBe(false)
    expect(log).toHaveBeenCalled()
  })

  test('picks up after a start that stopped once the share folder had moved', () => {
    const { dirs, oldData } = oldHome()
    // what is left if the first start ended after the first step
    const newData = join(dirs.data, 'rakun')
    renameSync(oldData, newData)
    symlinkSync(newData, oldData)

    expect(migrateFromOldRelic(dirs, quiet)).toBe('done')
    expect(
      existsSync(join(dirs.config, 'rakun', 'gog_store', 'auth.json'))
    ).toBe(true)
    expect(
      readlinkSync(join(newData, 'mount', 'legendary', 'user.json'))
    ).toContain(join(dirs.config, 'rakun'))
  })

  test('works without an old share folder', () => {
    const { dirs, oldData } = oldHome()
    rmSync(oldData, { recursive: true })

    expect(migrateFromOldRelic(dirs, quiet)).toBe('done')
    expect(existsSync(join(dirs.data, 'rakun'))).toBe(false)
  })
})

describe('removeLegacyData', () => {
  const rakunWith = (dirs: MigrationDirs, shortcuts?: string) => {
    mkdirSync(join(dirs.config, 'rakun'), { recursive: true })
    if (shortcuts !== undefined)
      writeFileSync(
        join(dirs.config, 'rakun', 'steam_shortcuts.json'),
        shortcuts
      )
  }

  test('removes the link, not what it points to, when no shortcut uses it', () => {
    const { dirs, oldData } = oldHome()
    migrateFromOldRelic(dirs, quiet)
    const execPath = join(dirs.data, 'rakun', 'runner', 'A.bat')
    writeFileSync(
      join(dirs.config, 'rakun', 'steam_shortcuts.json'),
      JSON.stringify([{ execPath }])
    )

    expect(removeLegacyData(dirs, quiet)).toBe(true)
    expect(lstatOf(oldData)).toBeUndefined()
    expect(existsSync(join(dirs.data, 'rakun', 'runner', 'Game.bat'))).toBe(
      true
    )
  })

  test('keeps it while a shortcut still runs a script under it', () => {
    const { dirs, oldData } = oldHome()
    rakunWith(
      dirs,
      JSON.stringify([
        { execPath: '/home/deck/.local/share/relic/runner/A.bat' }
      ])
    )

    expect(removeLegacyData(dirs, quiet)).toBe(false)
    expect(existsSync(oldData)).toBe(true)
  })

  test('removes it when rakun has no list, but not when the list is unreadable', () => {
    const first = oldHome()
    rakunWith(first.dirs)
    expect(removeLegacyData(first.dirs, quiet)).toBe(true)

    const second = oldHome()
    rakunWith(second.dirs, '{ broken')
    const log = vi.fn()
    expect(removeLegacyData(second.dirs, log)).toBe(false)
    expect(existsSync(second.oldData)).toBe(true)
    expect(log).toHaveBeenCalled()
  })

  test('does nothing before rakun has a folder, or without the old one', () => {
    const { dirs, oldData } = oldHome()
    expect(removeLegacyData(dirs, quiet)).toBe(false)
    expect(existsSync(oldData)).toBe(true)

    rakunWith(dirs, '[]')
    rmSync(oldData, { recursive: true })
    expect(removeLegacyData(dirs, quiet)).toBe(false)
  })
})
