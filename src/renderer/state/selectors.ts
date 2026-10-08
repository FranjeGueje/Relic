import type {
  AppSettings,
  GameInfo,
  GameStatus,
  InstallParams,
  InstallPlatform,
  Runner,
  StoreInfo
} from '../../shared/types'

/**
 * The pictures of a game for a card, best first. `art_square` is the tall box art
 * (3:4: 1200x1600 on Epic), `art_cover` the wide banner (16:9): on a tall card the
 * banner is cropped to its middle and looks zoomed in, so it is only the fallback.
 */
export function coverSources(game: GameInfo): string[] {
  return [...new Set([game.art_square, game.art_cover].filter(Boolean))]
}

/**
 * What leaving the client does to rakun, for the «quit?» dialog. rakunctl would
 * refuse to stop it while it works, so then it stays running.
 */
export function quitMessageKey(
  owns: boolean,
  busy: boolean
): 'confirm.quit.keep' | 'confirm.quit.closeToo' | 'confirm.quit.busy' {
  if (!owns) return 'confirm.quit.keep'
  return busy ? 'confirm.quit.busy' : 'confirm.quit.closeToo'
}

export type Filters = {
  store: Runner | 'all'
  installedOnly: boolean
  ascending: boolean
}

/** What the grid lists: DLC and games of other launchers are not installable here */
export function visibleGames(games: GameInfo[], filters: Filters): GameInfo[] {
  return games
    .filter((game) => !game.install.is_dlc && !game.thirdPartyManagedApp)
    .filter((game) => filters.store === 'all' || game.runner === filters.store)
    .filter((game) => !filters.installedOnly || game.is_installed)
    .sort((a, b) => {
      const order = a.title.localeCompare(b.title)
      return filters.ascending ? order : -order
    })
}

/** The stores that have games, in the order rakun lists them */
export function storesWithGames(
  games: GameInfo[],
  stores: StoreInfo[]
): StoreInfo[] {
  const present = new Set(games.map((game) => game.runner))
  return stores.filter((store) => present.has(store.id))
}

export type StoreTab = { store: StoreInfo; loading: boolean }

/**
 * The store tabs: those with games, and those still being read (so they show
 * from the start). Once a store has arrived with no games, it has no tab.
 */
export function storeTabs(
  games: GameInfo[],
  stores: StoreInfo[],
  libraryLoaded: Partial<Record<Runner, boolean>>
): StoreTab[] {
  const present = new Set(games.map((game) => game.runner))
  return stores
    .filter((store) => present.has(store.id) || !libraryLoaded[store.id])
    .map((store) => ({ store, loading: !libraryLoaded[store.id] }))
}

/** Next or previous option of a ring, e.g. the store tabs */
export function cycle<T>(options: T[], current: T, step: 1 | -1): T {
  if (options.length === 0) return current
  const index = options.indexOf(current)
  return options[(index + step + options.length) % options.length]
}

/** Statuses that are a download going on or waiting */
const DOWNLOADING = new Set(['installing', 'updating', 'extracting'])
const BUSY = new Set([
  ...DOWNLOADING,
  'queued',
  'repairing',
  'uninstalling',
  'moving',
  'importing',
  'launching',
  'playing',
  'syncing-saves',
  'winetricks'
])

export const isBusy = (status?: GameStatus): boolean =>
  !!status && BUSY.has(status.status)

export type GameAction =
  | 'install'
  | 'installWindows'
  | 'installLinux'
  | 'importFolder'
  | 'update'
  | 'repair'
  | 'uninstall'
  | 'cancel'
  | 'removeFromQueue'

/** Which build of a game to install, when the store has more than one */
export type Build = 'windows' | 'linux'

/** A Linux build next to a Windows one: the user chooses (a stale library has no `is_windows_native`: assume it) */
export const hasBothBuilds = (game: GameInfo): boolean =>
  !!game.is_linux_native && game.is_windows_native !== false

/** What can be done with a game now. Nothing, while another operation holds it. */
export function actionsFor(
  game: GameInfo,
  status: GameStatus | undefined,
  needsUpdate: boolean
): GameAction[] {
  if (status?.status === 'queued') return ['removeFromQueue']
  if (status && DOWNLOADING.has(status.status)) return ['cancel']
  if (isBusy(status)) return []
  if (!game.is_installed) {
    const install: GameAction[] = hasBothBuilds(game)
      ? ['installWindows', 'installLinux']
      : ['install']
    // Zoom has no way to register a game that is already on the disk
    return game.runner === 'zoom' ? install : [...install, 'importFolder']
  }
  return needsUpdate
    ? ['update', 'repair', 'uninstall']
    : ['repair', 'uninstall']
}

const windowsFor = (game: GameInfo): InstallPlatform =>
  game.runner === 'gog' || game.runner === 'zoom' ? 'windows' : 'Windows'

/** The one asked for; otherwise, as `rakunctl` does, a native Linux game gets its Linux build */
export function platformFor(game: GameInfo, build?: Build): InstallPlatform {
  if (build === 'windows') return windowsFor(game)
  if (build === 'linux' || game.is_linux_native) return 'linux'
  return windowsFor(game)
}

export function installParams(
  game: GameInfo,
  path: string,
  build?: Build
): InstallParams {
  return {
    appName: game.app_name,
    runner: game.runner,
    gameInfo: game,
    path,
    platformToInstall: platformFor(game, build)
  }
}

/** Moves a position in a grid by one key, stopping at the edges */
export function moveInGrid(
  index: number,
  key: 'up' | 'down' | 'left' | 'right',
  columns: number,
  count: number
): { index: number; leaves?: 'top' } {
  if (count === 0) return { index: 0 }
  const last = count - 1
  switch (key) {
    case 'left':
      return { index: Math.max(index - 1, 0) }
    case 'right':
      return { index: Math.min(index + 1, last) }
    case 'down':
      return { index: Math.min(index + columns, last) }
    case 'up':
      return index < columns
        ? { index, leaves: 'top' }
        : { index: index - columns }
  }
}

export type MenuEntry =
  | 'accounts'
  | 'helpers'
  | 'downloadPath'
  | 'protonPath'
  | 'steamGridDb'
  | 'language'

/** What the menu shows next to an entry: the setting as it is now (the key is never shown) */
export function menuValue(
  entry: MenuEntry,
  settings: AppSettings,
  t: (
    key: 'menu.automatic' | 'menu.configured' | 'menu.notConfigured'
  ) => string,
  languageName: (code: string) => string
): string {
  if (entry === 'downloadPath') return settings.defaultInstallPath
  if (entry === 'protonPath') return settings.protonPath || t('menu.automatic')
  if (entry === 'steamGridDb')
    return settings.steamGridDbApiKey
      ? t('menu.configured')
      : t('menu.notConfigured')
  if (entry === 'language') return languageName(settings.language)
  return ''
}
