import type {
  AccountsStatus,
  AppSettings,
  FolderListing,
  GameInfo,
  HelperInfo,
  HelpersUpdate,
  ImportParams,
  InstallParams,
  LoginInfo,
  LoginResult,
  QueueInfo,
  Runner,
  SettingKey,
  StoreInfo,
  UpdateParams
} from './types'

/**
 * The only channels of rakun the interface can ask for. The preload and the
 * main process both refuse anything else, so this list is what the renderer
 * can do.
 */
export type CallMap = {
  getStores: { args: []; result: StoreInfo[] }
  getLibrary: { args: [Runner | 'all']; result: GameInfo[] }
  getAccounts: { args: []; result: AccountsStatus }
  listFolders: { args: [path?: string]; result: FolderListing }
  logout: { args: [Runner]; result: null }
  refreshLibrary: { args: [Runner | 'all']; result: null }
  checkGameUpdates: { args: []; result: string[] }
  requestAppSettings: { args: []; result: AppSettings }
  install: { args: [InstallParams]; result: null }
  updateGame: { args: [UpdateParams]; result: null }
  // `error` when the store reported one; the library is what says whether it worked
  importGame: { args: [ImportParams]; result: { status: string } }
  getHelpers: { args: []; result: HelperInfo[] }
  /** Downloads the helpers that are missing (all of them, unchecked, with `latest`) */
  updateHelpers: { args: [{ latest?: boolean }]; result: HelpersUpdate }
  repair: { args: [string, Runner]; result: null }
  uninstall: { args: [string, Runner, boolean]; result: null }
  getDMQueueInformation: { args: []; result: QueueInfo }
  pauseCurrentDownload: { args: []; result: null }
  resumeCurrentDownload: { args: []; result: null }
  cancelDownload: { args: [boolean]; result: null }
  removeFromDMQueue: { args: [string]; result: null }
  clearFinishedDMQueue: { args: []; result: null }
}

export type CallChannel = keyof CallMap

/**
 * What the main process asks of rakun: the channels above plus the two of the
 * login, which only it uses (the interface never sees a login code).
 */
export type LinkCallMap = CallMap & {
  getLoginInfo: { args: [Runner]; result: LoginInfo }
  submitLogin: { args: [Runner, string]; result: LoginResult }
  setSetting: { args: [{ key: SettingKey; value: string }]; result: null }
}

const CALL_CHANNELS: readonly string[] = [
  'getStores',
  'getLibrary',
  'getAccounts',
  'listFolders',
  'logout',
  'refreshLibrary',
  'checkGameUpdates',
  'requestAppSettings',
  'install',
  'updateGame',
  'importGame',
  'getHelpers',
  'updateHelpers',
  'repair',
  'uninstall',
  'getDMQueueInformation',
  'pauseCurrentDownload',
  'resumeCurrentDownload',
  'cancelDownload',
  'removeFromDMQueue',
  'clearFinishedDMQueue'
] satisfies CallChannel[]

export function isCallChannel(channel: unknown): channel is CallChannel {
  return typeof channel === 'string' && CALL_CHANNELS.includes(channel)
}

/** The events of rakun (`GET /events`) the client listens to */
export const EVENT_CHANNELS = [
  'gameStatusUpdate',
  'progressUpdate',
  'changedDMQueueInformation',
  'pushGameToLibrary',
  'refreshLibrary',
  'helpersProgress',
  'showDialog'
] as const

/** The last `helpersProgress` line of an update: it is over */
export const HELPERS_DONE = 'done'

export type EventChannel = (typeof EVENT_CHANNELS)[number]

export type RakunEvent = { event: EventChannel; args: unknown[] }

/** `offline`: rakun does not answer (stopped, or the port changed) */
export type ConnectionState = 'connecting' | 'online' | 'offline'

export function isEventChannel(event: string): event is EventChannel {
  return (EVENT_CHANNELS as readonly string[]).includes(event)
}
