/**
 * The part of rakun's types this client needs. The contract is rakun's API.md;
 * these are copied, not imported, so the project stands on its own.
 */

export type Runner = 'legendary' | 'gog' | 'nile' | 'zoom'

export type LoginInfo = { runner: Runner; url: string; instructions: string }

export type LoginResult = { ok: boolean; error?: string }

export type AccountStatus = { loggedIn: boolean; name?: string }

export type AccountsStatus = Record<Runner, AccountStatus>

/** What a client needs to list and name a store */
export type StoreInfo = {
  id: Runner
  /** Short name to type or show: `epic`, `gog`, `amazon`, `zoom` */
  name: string
  label: string
}

/** One helper binary (legendary, gogdl, nile, comet, epic-integration, zoom-platform, umu) */
export type HelperInfo = {
  helper: string
  /** The version rakun was tested with */
  pinned: string
  /** The one that is installed, if it is known */
  installed: string
  /** `ok`, `missing`, or `other` (another version, for instance after «latest») */
  state: 'ok' | 'missing' | 'other'
}

export type HelpersUpdate = {
  helpers: HelperInfo[]
  failures: { helper: string; error: string }[]
}

export type InstallPlatform = 'Windows' | 'windows' | 'linux'

export type GameInfo = {
  runner: Runner
  app_name: string
  title: string
  art_cover: string
  art_square: string
  is_installed: boolean
  is_linux_native?: boolean
  is_windows_native?: boolean
  developer?: string
  description?: string
  /** A game managed by another launcher (EA App, Ubisoft Connect…): not installable here */
  thirdPartyManagedApp?: string
  install: {
    install_path?: string
    install_size?: string
    version?: string
    is_dlc?: boolean
  }
}

export type Status =
  | 'installing'
  | 'importing'
  | 'updating'
  | 'launching'
  | 'playing'
  | 'uninstalling'
  | 'repairing'
  | 'done'
  | 'canceled'
  | 'moving'
  | 'queued'
  | 'error'
  | 'syncing-saves'
  | 'notAvailable'
  | 'notSupportedGame'
  | 'notInstalled'
  | 'installed'
  | 'extracting'
  | 'winetricks'

export type InstallProgress = {
  bytes: string
  eta: string
  percent?: number
  /** MB/s */
  downSpeed?: number
  file?: string
}

export type GameStatus = {
  appName: string
  runner?: Runner
  status: Status
  progress?: InstallProgress
  context?: string
}

export type DMStatus = 'done' | 'error' | 'abort' | 'paused'
export type DownloadManagerState = 'idle' | 'running' | 'paused' | 'stopped'

export type InstallParams = {
  appName: string
  runner: Runner
  gameInfo: GameInfo
  path: string
  platformToInstall: InstallPlatform
  installLanguage?: string
  /** Omitted: every DLC */
  installDlcs?: string[]
}

/** A game that is already on the disk, in `path`, to be registered */
export type ImportParams = {
  appName: string
  runner: Runner
  path: string
  platform: InstallPlatform
}

export type UpdateParams = {
  appName: string
  runner: Runner
  gameInfo: GameInfo
}

export type DMQueueElement = {
  type: 'update' | 'install'
  params: Pick<InstallParams, 'appName' | 'runner' | 'path'> & {
    gameInfo: GameInfo
    size?: string
  }
  addToQueueTime: number
  startTime: number
  endTime: number
  status?: DMStatus
  /** Why it ended in `error`, when the store said */
  error?: string
}

export type QueueInfo = {
  elements: DMQueueElement[]
  finished: DMQueueElement[]
  state: DownloadManagerState
}

/** The settings of rakun the client reads (it never changes them) */
export type AppSettings = {
  /** The language rakun asks the stores for (GOG's default); not the interface's */
  language: string
  defaultInstallPath: string
  /** Empty: rakun picks the first GE-Proton it finds */
  protonPath: string
  steamGridDbApiKey: string
}

/** The only settings the interface may change (the rest stays in rakun) */
export const SETTING_KEYS = [
  'language',
  'defaultInstallPath',
  'protonPath',
  'steamGridDbApiKey'
] as const

export type SettingKey = (typeof SETTING_KEYS)[number]

/** The folders inside a folder, for the folder picker */
export type FolderListing = {
  path: string
  /** `null` at the root of the disk */
  parent: string | null
  folders: string[]
}

/** rakun's `showDialog` event: a problem it used to show in a window */
export type DialogNotice = {
  title: string
  message: string
}
