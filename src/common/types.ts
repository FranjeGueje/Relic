import {
  GOGCloudSavesLocation,
  GogInstallInfo,
  GogInstallPlatform
} from './types/gog'
import {
  LegendaryInstallPlatform,
  GameMetadataInner,
  LegendaryInstallInfo
} from './types/legendary'
import { NileInstallInfo, NileInstallPlatform } from './types/nile'
import {
  ZoomInstallPlatform,
  ZoomInstalledInfo,
  ZoomInstallInfo
} from './types/zoom'
import { TitleBarOverlay } from 'electron'
import { ChildProcess } from 'child_process'
import type { Path } from 'backend/schemas'
import type LogWriter from 'backend/logger/log_writer'

export type Runner = 'legendary' | 'gog' | 'sideload' | 'nile' | 'zoom'

// NOTE: Do not put enum's in this module or it will break imports

export type DialogType = 'MESSAGE' | 'ERROR'

export interface ButtonOptions {
  text: string
  onClick?: () => void
}

export type LaunchOption =
  | BaseLaunchOption
  | AltExeLaunchOption
  | DLCLaunchOption

interface BaseLaunchOption {
  type?: 'basic'
  name: string
  parameters: string
}

interface AltExeLaunchOption {
  type: 'altExe'
  executable: Path
}

interface DLCLaunchOption {
  type: 'dlc'
  dlcAppName: string
  dlcTitle: string
}

interface About {
  description: string
  shortDescription: string
}

export type Release = {
  type: 'stable' | 'beta'
  html_url: string
  name: string
  tag_name: string
  published_at: string
  prerelease: boolean
  id: number
  body?: string
}

export type ExperimentalFeatures = {
  enableHelp: boolean
  cometSupport: boolean
  umuSupport?: boolean
  zoomPlatform?: boolean
}

export interface AppSettings extends GameSettings {
  addDesktopShortcuts: boolean
  addSteamShortcuts: boolean
  altGogdlBin: string
  altCometBin: string
  altLegendaryBin: string
  altNileBin: string
  autoUpdateGames: boolean
  checkForUpdatesOnStartup: boolean
  checkUpdatesInterval: number
  defaultInstallPath: string
  defaultSteamPath: string
  disableGOGPresence: boolean
  enableUpdates: boolean
  experimentalFeatures?: ExperimentalFeatures
  maxWorkers: number
  verboseLogs: boolean
  steamGridDbApiKey: string
}

export type ExecResult = {
  stderr: string
  stdout: string
  fullCommand?: string
  error?: string
  abort?: boolean
}

export interface ExtraInfo {
  about?: About
  reqs: Reqs[]
  releaseDate?: string
  storeUrl?: string
  changelog?: string
  genres?: string[]
}

export type GameConfigVersion = 'auto' | 'v0' | 'v0.1'

export type GOGAchievement = {
  achievement_id: string
  achievement_key: string
  visible: boolean
  name: string
  description: string
  image_url_unlocked: string
  image_url_locked: string
  rarity: number
  date_unlocked: string | null
  rarity_level_description: string
  rarity_level_slug: string
}

export type GameAchievement = GOGAchievement

export interface GameInfo {
  runner: 'legendary' | 'gog' | 'sideload' | 'nile' | 'zoom'
  store_url?: string
  app_name: string
  art_cover: string
  art_logo?: string
  art_background?: string
  art_icon?: string
  art_square: string
  cloud_save_enabled?: boolean
  developer?: string
  extra?: ExtraInfo
  folder_name?: string
  install: Partial<InstalledInfo>
  installable?: boolean
  is_installed: boolean
  namespace?: string
  // NOTE: This is the save folder without any variables filled in...
  save_folder?: string
  // ...and this is the folder with them filled in
  save_path?: string
  gog_save_location?: GOGCloudSavesLocation[]
  title: string
  canRunOffline: boolean
  thirdPartyManagedApp?: string
  isEAManaged?: boolean
  isUbisoftManaged?: boolean
  is_mac_native?: boolean
  is_linux_native?: boolean
  browserUrl?: string
  description?: string
  //used for store release versions. if remote !== local, then update
  version?: string
  dlcList?: GameMetadataInner[]
  customUserAgent?: string
  launchFullScreen?: boolean
  overrides?: {
    title?: string
    art_cover?: string
    art_square?: string
  }
}

export interface GameSettings {
  ignoreGameUpdates: boolean
  language: string
  maxSharpness?: number
  offlineMode: boolean
  targetExe: string
  savesPath: string
  gogSaves?: GOGCloudSavesLocation[]
  verboseLogs: boolean
  enableQuickSavesMenu: boolean
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
  | 'redist'
  | 'extracting'
  | 'winetricks'

export interface GameStatus {
  appName: string
  progress?: InstallProgress
  folder?: string
  context?: string // Additional context e.g current step
  runner?: Runner
  status: Status
}

export type GlobalConfigVersion = 'auto' | 'v0'
export interface InstallProgress {
  bytes: string
  eta: string
  folder?: string
  percent?: number
  downSpeed?: number
  diskSpeed?: number
  file?: string
}
export interface InstalledInfo {
  manifest?: {
    disk_size: number
    download_size: number
    app_name: string
    languages: string[]
    versionEtag: string
    dependencies: string[]
    perLangSize: {
      [key: string]: {
        download_size: number
        disk_size: number
      }
    }
  }
  executable: string
  install_path: string
  install_size: string
  is_dlc: boolean
  isDosbox?: boolean
  dosboxConf?: string[]
  version: string
  platform: InstallPlatform
  appName?: string
  installedWithDLCs?: boolean // OLD DLC boolean (all dlcs installed)
  installedDLCs?: string[] // New installed GOG DLCs array
  language?: string // For GOG games
  versionEtag?: string // Checksum for checking GOG updates
  buildId?: string // For verifing and version pinning of GOG games
  branch?: string // GOG beta channels
  // Whether to skip update check for this title (currently only used for GOG as it is the only platform actively supporting version rollback)
  pinnedVersion?: boolean
  cyberpunk?: {
    // Cyberpunk compatibility options
    modsEnabled: boolean
    modsToLoad: string[] // If this is empty redmod will load mods in alphabetic order
  }
}

export interface Reqs {
  minimum: string
  recommended: string
  title: string
}

export type SyncType = 'Download' | 'Upload' | 'Force download' | 'Force upload'

export type UserInfo = {
  account_id: string
  displayName: string
  user: string
}
export interface InstallArgs {
  path: string
  platformToInstall: InstallPlatform
  installDlcs?: Array<string>
  sdlList?: string[]
  installLanguage?: string
  branch?: string
  build?: string
  dependencies?: string[]
}

export interface InstallParams extends InstallArgs {
  appName: string
  gameInfo: GameInfo
  runner: Runner
  size?: string
}

export interface UpdateParams {
  appName: string
  runner: Runner
  gameInfo: GameInfo
  installDlcs?: Array<string>
  installLanguage?: string
  build?: string
  branch?: string
}

export interface GOGLoginData {
  expires_in: number
  access_token: string
  refresh_token: string
  user_id: string
  loginTime: number
  error?: boolean
}

export interface GOGImportData {
  // "appName": "1441974651", "buildId": "55136646198962890", "title": "Prison Architect", "tasks": [{"category": "launcher", "isPrimary": true, "languages": ["en-US"], "name": "Prison Architect", "osBitness": ["64"], "path": "Launcher/dowser.exe", "type": "FileTask"}, {"category": "game", "isHidden": true, "languages": ["en-US"], "name": "Prison Architect - launcher process Prison Architect64_exe", "osBitness": ["64"], "path": "Prison Architect64.exe", "type": "FileTask"}, {"category": "document", "languages": ["en-US"], "link": "http://www.gog.com/support/prison_architect", "name": "Support", "type": "URLTask"}, {"category": "other", "languages": ["en-US"], "link": "http://www.gog.com/forum/prison_architect/prison_break_escape_map_megathread/post1", "name": "Escape Map Megathread", "type": "URLTask"}], "installedLanguage": "en-US"}
  appName: string
  buildId: string
  title: string
  tasks: Array<{
    category: string
    isPrimary?: boolean
    languages?: Array<string>
    arguments?: Array<string> | string
    path: string
    name: string
    type: string
  }>
  installedLanguage: string
  platform: GogInstallPlatform
  versionName: string
  dlcs: string[]
}

export interface CallRunnerOptions {
  logMessagePrefix?: string
  logWriters?: LogWriter[]
  logSanitizer?: (line: string) => string
  env?: Record<string, string> | NodeJS.ProcessEnv
  wrappers?: string[]
  onOutput?: (output: string, child: ChildProcess) => void
  abortId?: string
  cwd?: string
}

export interface WrapperEnv {
  appName: string
  appRunner: Runner
}


export type RecentGame = {
  appName: string
  title: string
}

export type HiddenGame = RecentGame

export type FavouriteGame = HiddenGame

export type RefreshOptions = {
  checkForUpdates?: boolean
  fullRefresh?: boolean
  library?: Runner | 'all'
  runInBackground?: boolean
}

export type GamepadActionStatus = Record<
  ValidGamepadAction,
  {
    triggeredAt: { [key: number]: number }
    repeatDelay: false | number
  }
>

export type ValidGamepadAction = GamepadActionArgs['action']

export type GamepadActionArgs =
  | GamepadActionArgsWithMetadata
  | GamepadActionArgsWithoutMetadata

interface GamepadActionArgsWithMetadata {
  action: 'leftClick' | 'rightClick'
  metadata: {
    elementTag: string
    x: number
    y: number
  }
}

interface GamepadActionArgsWithoutMetadata {
  action:
    | 'padUp'
    | 'padDown'
    | 'padLeft'
    | 'padRight'
    | 'leftStickUp'
    | 'leftStickDown'
    | 'leftStickLeft'
    | 'leftStickRight'
    | 'rightStickUp'
    | 'rightStickDown'
    | 'rightStickLeft'
    | 'rightStickRight'
    | 'mainAction'
    | 'back'
    | 'altAction'
    | 'esc'
    | 'tab'
    | 'shiftTab'
    | 'keyboardClick'
    | 'guide'
  metadata?: undefined
}

export type InstallPlatform =
  | LegendaryInstallPlatform
  | GogInstallPlatform
  | NileInstallPlatform
  | ZoomInstallPlatform
  | 'Browser'

export type ConnectivityStatus = 'offline' | 'check-online' | 'online'

export type DMStatus = 'done' | 'error' | 'abort' | 'paused'
export interface DMQueueElement {
  type: 'update' | 'install'
  params: InstallParams
  addToQueueTime: number
  startTime: number
  endTime: number
  status?: DMStatus
}

export interface SaveSyncArgs {
  arg: string | undefined
  path: string
  appName: string
  runner: Runner
}

export interface ImportGameArgs {
  appName: string
  path: string
  runner: Runner
  platform: InstallPlatform
}

export interface MoveGameArgs {
  appName: string
  path: string
  runner: Runner
}

export interface DiskSpaceData {
  free: number
  diskSize: number
  message: string
  validPath: boolean

}

export type StatusPromise = Promise<{ status: 'done' | 'error' | 'abort' }>

export type DownloadManagerState = 'idle' | 'running' | 'paused' | 'stopped'

export interface WindowProps extends Electron.Rectangle {
  maximized: boolean
  frame?: boolean
  titleBarStyle?: 'default' | 'hidden' | 'hiddenInset'
  titleBarOverlay?: TitleBarOverlay | boolean
}

export type InstallInfo =
  | LegendaryInstallInfo
  | GogInstallInfo
  | NileInstallInfo
  | ZoomInstalledInfo
  | ZoomInstallInfo

export interface KnowFixesInfo {
  title: string
  notes?: Record<string, string>
  winetricks?: string[]
  runInPrefix?: string[]
  envVariables?: Record<string, string>
  wikiLink?: string
}

export interface UploadedLogData {
  // Descriptive name of the log file (e.g. "Game log of ...")
  name: string
  // Token to modify the file (used to delete the log file on the server)
  token: string
  // Time the log file was uploaded (used to know whether it expired)
  uploadedAt: number
}

export interface RunnerCommandStub {
  commandParts: string[]
  response?: Promise<ExecResult>
  stdout?: string
  stderr?: string
}

export interface SGDBGrid {
  id: number
  url: string
  thumb: string
}

export interface SGDBGame {
  id: number
  name: string
}
