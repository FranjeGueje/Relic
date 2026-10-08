import { describe, expect, test } from 'vitest'
import type { GameInfo, GameStatus } from '../../../shared/types'
import {
  actionsFor,
  coverSources,
  cycle,
  installParams,
  isBusy,
  menuValue,
  moveInGrid,
  platformFor,
  quitMessageKey,
  storeTabs,
  visibleGames
} from '../selectors'

const game = (app_name: string, extra: Partial<GameInfo> = {}): GameInfo => ({
  runner: 'gog',
  app_name,
  title: app_name,
  art_cover: '',
  art_square: '',
  is_installed: false,
  install: {},
  ...extra
})
const status = (value: GameStatus['status']): GameStatus => ({
  appName: 'a',
  status: value
})

describe('visibleGames', () => {
  const games = [
    game('b', { is_installed: true }),
    game('a', { runner: 'legendary' }),
    game('dlc', { install: { is_dlc: true } }),
    game('ea', { thirdPartyManagedApp: 'EA' })
  ]
  const all = { store: 'all', installedOnly: false, ascending: true } as const

  test('hides DLC and games of other launchers, and sorts by title', () => {
    expect(visibleGames(games, all).map((g) => g.app_name)).toEqual(['a', 'b'])
    expect(
      visibleGames(games, { ...all, ascending: false }).map((g) => g.app_name)
    ).toEqual(['b', 'a'])
  })

  test('filters by store and by installed', () => {
    expect(
      visibleGames(games, { ...all, store: 'legendary' }).map((g) => g.app_name)
    ).toEqual(['a'])
    expect(
      visibleGames(games, { ...all, installedOnly: true }).map(
        (g) => g.app_name
      )
    ).toEqual(['b'])
  })

  test('does not reorder the list it is given', () => {
    const list = [game('b'), game('a')]
    visibleGames(list, all)
    expect(list.map((g) => g.app_name)).toEqual(['b', 'a'])
  })
})

describe('stores', () => {
  const stores = [
    { id: 'legendary', name: 'epic', label: 'Epic' },
    { id: 'gog', name: 'gog', label: 'GOG' },
    { id: 'zoom', name: 'zoom', label: 'Zoom' }
  ] as const

  test('tabs: the stores with games, and those still being read', () => {
    const games = [game('a'), game('b', { runner: 'legendary' })]
    const tabs = storeTabs(games, [...stores], {
      gog: true,
      legendary: true,
      zoom: true
    })
    expect(tabs.map((t) => [t.store.id, t.loading])).toEqual([
      ['legendary', false],
      ['gog', false]
    ])

    // nile arrived empty: no tab; a store not read yet shows with «loading»
    const reading = storeTabs(
      games,
      [...stores, { id: 'nile', name: 'amazon', label: 'Amazon' }],
      {
        gog: true,
        legendary: true,
        nile: true,
        zoom: true
      }
    )
    expect(reading.map((t) => t.store.id)).toEqual(['legendary', 'gog'])
    expect(
      storeTabs([], [...stores], {}).map((t) => [t.store.id, t.loading])
    ).toEqual([
      ['legendary', true],
      ['gog', true],
      ['zoom', true]
    ])
  })

  test('cycle goes round in both directions', () => {
    expect(cycle(['all', 'gog', 'zoom'], 'zoom', 1)).toBe('all')
    expect(cycle(['all', 'gog', 'zoom'], 'all', -1)).toBe('zoom')
    expect(cycle([], 'x', 1)).toBe('x')
  })
})

describe('actionsFor', () => {
  test('a game that is not installed can be installed', () => {
    expect(actionsFor(game('a'), undefined, false)).toEqual([
      'install',
      'importFolder'
    ])
  })

  test('an installed one can be repaired or uninstalled, updated first if it needs it', () => {
    const installed = game('a', { is_installed: true })
    expect(actionsFor(installed, undefined, false)).toEqual([
      'repair',
      'uninstall'
    ])
    expect(actionsFor(installed, undefined, true)).toEqual([
      'update',
      'repair',
      'uninstall'
    ])
  })

  test('a download in progress can be cancelled; a queued game removed', () => {
    expect(actionsFor(game('a'), status('installing'), false)).toEqual([
      'cancel'
    ])
    expect(
      actionsFor(game('a', { is_installed: true }), status('updating'), true)
    ).toEqual(['cancel'])
    expect(actionsFor(game('a'), status('queued'), false)).toEqual([
      'removeFromQueue'
    ])
  })

  test('another operation holds the game: nothing to offer', () => {
    expect(
      actionsFor(game('a', { is_installed: true }), status('repairing'), false)
    ).toEqual([])
    expect(
      actionsFor(
        game('a', { is_installed: true }),
        status('uninstalling'),
        false
      )
    ).toEqual([])
  })

  test('a game with both builds lets the user choose, the rest has one way to install', () => {
    const both = game('a', { is_linux_native: true, is_windows_native: true })
    expect(actionsFor(both, undefined, false)).toEqual([
      'installWindows',
      'installLinux',
      'importFolder'
    ])
    // A library saved before `is_windows_native` existed: assume it has one
    expect(
      actionsFor(game('a', { is_linux_native: true }), undefined, false)
    ).toEqual(['installWindows', 'installLinux', 'importFolder'])
    expect(
      actionsFor(
        game('a', { is_linux_native: true, is_windows_native: false }),
        undefined,
        false
      )
    ).toEqual(['install', 'importFolder'])
    expect(actionsFor(game('a'), undefined, false)).toEqual([
      'install',
      'importFolder'
    ])
  })

  test('a game that is not installed can also be imported, except on Zoom', () => {
    expect(actionsFor(game('a'), undefined, false)).toEqual([
      'install',
      'importFolder'
    ])
    expect(actionsFor(game('a', { runner: 'zoom' }), undefined, false)).toEqual(
      ['install']
    )
    expect(
      actionsFor(game('a', { is_installed: true }), undefined, false)
    ).not.toContain('importFolder')
  })

  test('the build asked for wins over the default', () => {
    const both = game('a', { is_linux_native: true, is_windows_native: true })
    expect(platformFor(both, 'windows')).toBe('windows')
    expect(platformFor(both, 'linux')).toBe('linux')
    expect(platformFor(game('a', { runner: 'legendary' }), 'windows')).toBe(
      'Windows'
    )
    expect(installParams(both, '/g', 'windows').platformToInstall).toBe(
      'windows'
    )
  })

  test('isBusy', () => {
    expect(isBusy(status('queued'))).toBe(true)
    expect(isBusy(status('done'))).toBe(false)
    expect(isBusy(undefined)).toBe(false)
  })
})

describe('installing', () => {
  test('the platform follows the rule of rakunctl', () => {
    expect(platformFor(game('a', { is_linux_native: true }))).toBe('linux')
    expect(platformFor(game('a'))).toBe('windows')
    expect(platformFor(game('a', { runner: 'zoom' }))).toBe('windows')
    expect(platformFor(game('a', { runner: 'legendary' }))).toBe('Windows')
    expect(platformFor(game('a', { runner: 'nile' }))).toBe('Windows')
  })

  test('the parameters carry the game, the path and the platform', () => {
    const g = game('a', { runner: 'legendary' })
    expect(installParams(g, '/juegos')).toEqual({
      appName: 'a',
      runner: 'legendary',
      gameInfo: g,
      path: '/juegos',
      platformToInstall: 'Windows'
    })
  })
})

describe('moveInGrid', () => {
  test('left and right stop at the ends', () => {
    expect(moveInGrid(0, 'left', 4, 10).index).toBe(0)
    expect(moveInGrid(9, 'right', 4, 10).index).toBe(9)
    expect(moveInGrid(3, 'right', 4, 10).index).toBe(4)
  })

  test('down moves a row, and the last row stays on the last game', () => {
    expect(moveInGrid(1, 'down', 4, 10).index).toBe(5)
    expect(moveInGrid(7, 'down', 4, 10).index).toBe(9)
  })

  test('up moves a row; from the first row it leaves through the top', () => {
    expect(moveInGrid(5, 'up', 4, 10).index).toBe(1)
    expect(moveInGrid(2, 'up', 4, 10)).toEqual({ index: 2, leaves: 'top' })
  })

  test('with no games there is nowhere to go', () => {
    expect(moveInGrid(3, 'down', 4, 0).index).toBe(0)
  })
})

describe('coverSources', () => {
  test('the tall box art goes first, the wide banner only as a fallback', () => {
    expect(
      coverSources(game('a', { art_square: 'tall', art_cover: 'wide' }))
    ).toEqual(['tall', 'wide'])
  })

  test('no repeats, no empty ones', () => {
    expect(
      coverSources(game('a', { art_square: 'same', art_cover: 'same' }))
    ).toEqual(['same'])
    expect(
      coverSources(game('a', { art_square: '', art_cover: 'wide' }))
    ).toEqual(['wide'])
    expect(coverSources(game('a'))).toEqual([])
  })
})

describe('quitMessageKey', () => {
  test('says what happens to rakun when the client leaves', () => {
    expect(quitMessageKey(false, false)).toBe('confirm.quit.keep')
    expect(quitMessageKey(false, true)).toBe('confirm.quit.keep')
    expect(quitMessageKey(true, false)).toBe('confirm.quit.closeToo')
    expect(quitMessageKey(true, true)).toBe('confirm.quit.busy')
  })
})

describe('menuValue', () => {
  const settings = {
    language: 'es',
    defaultInstallPath: '/games',
    protonPath: '',
    steamGridDbApiKey: 'secret'
  }
  const t = (key: string) => key
  const name = (code: string) => `name:${code}`

  test('shows each setting as it is, and «automatic» for an empty Proton folder', () => {
    expect(menuValue('downloadPath', settings, t, name)).toBe('/games')
    expect(menuValue('protonPath', settings, t, name)).toBe('menu.automatic')
    expect(
      menuValue('protonPath', { ...settings, protonPath: '/p' }, t, name)
    ).toBe('/p')
    expect(menuValue('language', settings, t, name)).toBe('name:es')
    expect(menuValue('accounts', settings, t, name)).toBe('')
  })

  test('never shows the key, only whether there is one', () => {
    expect(menuValue('steamGridDb', settings, t, name)).toBe('menu.configured')
    expect(
      menuValue('steamGridDb', { ...settings, steamGridDbApiKey: '' }, t, name)
    ).toBe('menu.notConfigured')
  })
})
